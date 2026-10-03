// Tier circle uma.moe: club_rank 1..11 -> D, D+, C, C+, B, B+, A, A+, S, S+, SS
export const RANK_NAMES = ["D", "D+", "C", "C+", "B", "B+", "A", "A+", "S", "S+", "SS"] as const;

export const rankIcon = (rank: number) =>
  `https://uma.moe/assets/images/icon/circle_rank/utx_ico_circle_rank_${String(rank).padStart(2, "0")}.webp`;

export type RankRow = { rank: number; name: string; icon: string; fields: [string, unknown][] };

const RANK_KEYS = ["rank_index", "club_rank", "rank", "tier", "level", "rank_id", "id"];

function toRank(v: unknown): number | null {
  if (typeof v === "number" && v >= 1 && v <= 11) return v;
  if (typeof v === "string") {
    const i = RANK_NAMES.indexOf(v.trim().toUpperCase() as (typeof RANK_NAMES)[number]);
    if (i >= 0) return i + 1;
    if (/^\d+$/.test(v) && +v >= 1 && +v <= 11) return +v;
  }
  return null;
}

// Cari array / map tier di mana pun di dalam response, bentuknya tidak harus persis.
function findEntries(body: unknown): [string | null, unknown][] {
  if (Array.isArray(body)) return body.map((x, i) => [String(i), x]);
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    for (const v of Object.values(o)) if (Array.isArray(v) && v.length) return v.map((x, i) => [String(i), x]);
    const keys = Object.keys(o);
    if (keys.some((k) => toRank(k) !== null)) return keys.map((k) => [k, o[k]]);
    for (const v of Object.values(o)) if (v && typeof v === "object") { const r = findEntries(v); if (r.length) return r; }
  }
  return [];
}

export function parseRanks(body: unknown): RankRow[] {
  const entries = findEntries(body);
  const rows: RankRow[] = [];
  entries.forEach(([key, val], i) => {
    let rank: number | null = null;
    let fields: [string, unknown][] = [];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const o = val as Record<string, unknown>;
      for (const k of RANK_KEYS) if (rank === null && k in o) rank = toRank(o[k]);
      // buang field identitas rank (rank_index, name) karena sudah ditampilkan sebagai ikon
      fields = Object.entries(o).filter(([k, v]) => !(RANK_KEYS.includes(k) && toRank(v) === rank) && k !== "name");
    } else {
      fields = [["value", val]];
    }
    if (rank === null && key !== null) rank = toRank(key);
    if (rank === null && entries.length === 11) rank = i + 1; // urutan array = D..SS
    if (rank === null) return;
    rows.push({ rank, name: RANK_NAMES[rank - 1], icon: rankIcon(rank), fields });
  });
  return rows.sort((a, b) => a.rank - b.rank);
}
