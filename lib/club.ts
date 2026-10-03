// Parsing response GET /api/v4/circles?circle_id=...
// daily_fans[i] = total fans kumulatif member di akhir hari kompetisi i (index 0 = baseline akhir bulan lalu).
// Nilai negatif = penanda pindah circle, 0 di tengah = scrape terlewat.

export type Member = {
  viewerId: string; name: string; isLeader: boolean;
  total: number | null; monthGain: number | null; lastDayGain: number | null; avgPerDay: number | null;
  days: { day: number; gain: number }[]; joinedDay: number; lastDay: number; updated: string | null;
  raw: (number | null)[]; // daily_fans mentah, untuk diagnosa
  leftDay: number | null; // hari pertama bernilai negatif setelah member tercatat (penanda pindah circle), null = masih aktif
  prevCircleId: string; prevCircleName: string;
};
export type Club = {
  id: string; name: string; leaderId: string; leaderName: string | null; memberCount: number | null;
  tier: number | null; liveRank: number | null; monthlyRank: number | null;
  livePoints: number | null; monthlyPoint: number | null; lastUpdated: string | null;
  toNext: number | null; toLower: number | null; members: Member[];
};

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && isFinite(+v) ? +v : null);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function analyse(daily: unknown) {
  const raw = Array.isArray(daily) ? daily.map((x) => num(x)) : [];
  let first = raw.findIndex((x) => x !== null && x > 0);
  let last = -1;
  raw.forEach((x, i) => { if (x !== null && x > 0) last = i; });
  // Penanda keluar: nilai negatif sesudah member mulai tercatat dan tidak ada nilai positif lagi sesudahnya.
  const neg = raw.findIndex((x, i) => x !== null && x < 0 && (first < 0 || i > first));
  const leftDay = neg >= 0 && last < neg ? neg : null;
  if (first < 0) return { total: null, monthGain: null, lastDayGain: null, avgPerDay: null, days: [], joinedDay: -1, lastDay: -1, leftDay, raw };
  const f: number[] = []; // forward-fill celah
  for (let i = first; i <= last; i++) f[i] = raw[i] !== null && raw[i]! > 0 ? raw[i]! : f[i - 1];
  const days: { day: number; gain: number }[] = [];
  for (let i = first + 1; i <= last; i++) days.push({ day: i, gain: f[i] - f[i - 1] });
  const monthGain = f[last] - f[first];
  const present = Math.max(1, last - first);
  return {
    total: f[last], monthGain, lastDayGain: days.length ? days[days.length - 1].gain : 0,
    avgPerDay: Math.round(monthGain / present), days, joinedDay: first, lastDay: last, leftDay, raw,
  };
}

export function parseClub(body: unknown): Club | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const c = (b.circle && typeof b.circle === "object" ? b.circle : b) as Record<string, unknown>;
  const leaderId = str(c.leader_viewer_id);
  const members: Member[] = (Array.isArray(b.members) ? b.members : []).flatMap((m) => {
    if (!m || typeof m !== "object") return [];
    const o = m as Record<string, unknown>;
    const a = analyse(o.daily_fans);
    const viewerId = str(o.viewer_id);
    return [{ viewerId, name: str(o.trainer_name) || "(tanpa nama)", isLeader: viewerId !== "" && viewerId === leaderId, updated: o.last_updated ? str(o.last_updated) : null, prevCircleId: str(o.previous_circle_id), prevCircleName: str(o.previous_circle_name), ...a }];
  });
  const leader = members.find((m) => m.isLeader);
  const tier = num(b.club_rank);
  return {
    id: str(c.circle_id), name: str(c.name) || "(tanpa nama)", leaderId, leaderName: leader?.name ?? null,
    memberCount: num(c.member_count), tier: tier !== null && tier >= 1 && tier <= 11 ? tier : null,
    liveRank: num(c.live_rank), monthlyRank: num(c.monthly_rank),
    livePoints: num(c.live_points), monthlyPoint: num(c.monthly_point), lastUpdated: c.last_live_update ? str(c.last_live_update) : c.last_updated ? str(c.last_updated) : null,
    toNext: num(b.fans_to_next_tier), toLower: num(b.fans_to_lower_tier), members,
  };
}

export type LeftInfo = { kind: "marker" | "likely"; reason: string };

// Deteksi member yang sudah tidak di circle. API tidak punya field "left", jadi:
// 1) "marker": daily_fans negatif setelah member tercatat (lihat analyse).
// 2) "likely": members[] berisi baris lebih banyak dari member_count. Kelebihannya diduga mantan member,
//    dipilih dari yang datanya berhenti paling awal / last_updated paling lama (hanya yang jelas tertinggal).
export function detectLeft(c: Club): Map<string, LeftInfo> {
  const out = new Map<string, LeftInfo>();
  c.members.forEach((m) => { if (m.leftDay !== null) out.set(m.viewerId, { kind: "marker", reason: `daily_fans negatif sejak H${m.leftDay}` }); });
  if (c.memberCount === null) return out;
  const extra = c.members.length - out.size - c.memberCount;
  if (extra <= 0) return out;
  const rest = c.members.filter((m) => !out.has(m.viewerId));
  const t = (m: Member) => { const v = m.updated ? Date.parse(m.updated) : NaN; return isNaN(v) ? 0 : v; };
  const maxDay = Math.max(...rest.map((m) => m.lastDay));
  const maxUpd = Math.max(...rest.map(t));
  rest.filter((m) => m.lastDay < maxDay || t(m) < maxUpd - 6 * 3600e3)
    .sort((a, b) => a.lastDay - b.lastDay || t(a) - t(b))
    .slice(0, extra)
    .forEach((m) => out.set(m.viewerId, { kind: "likely", reason: `data berhenti di H${m.lastDay} (member lain sampai H${maxDay}); update terakhir ${m.updated ?? "-"}` }));
  return out;
}