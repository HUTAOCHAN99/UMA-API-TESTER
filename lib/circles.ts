import { RankRow } from "./ranks";

export type CircleRow = {
  id: string; name: string; rank: number; tier: number | null;
  live: number | null; monthly: number | null; members: number | null; raw: Record<string, unknown>;
};

const num = (v: unknown): number | null => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && isFinite(+v)) return +v;
  return null;
};
const pick = (o: Record<string, unknown>, keys: string[]) => { for (const k of keys) if (o[k] != null) return o[k]; return null; };

function findList(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const vals = Object.values(body as Record<string, unknown>);
    const arr = vals.find((v) => Array.isArray(v) && v.length && typeof v[0] === "object");
    if (arr) return arr as unknown[];
    for (const v of vals) if (v && typeof v === "object") { const r = findList(v); if (r.length) return r; }
  }
  return [];
}

export function findTotal(body: unknown): number | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  for (const k of ["total", "total_count", "count", "total_circles"]) { const n = num(o[k]); if (n !== null) return n; }
  for (const v of Object.values(o)) if (v && typeof v === "object" && !Array.isArray(v)) { const n = findTotal(v); if (n !== null) return n; }
  return null;
}

// Tier dari posisi ranking, memakai ranking_from/ranking_to dari endpoint rank-thresholds.
export function tierFromPosition(pos: number, th: RankRow[]): number | null {
  for (const t of th) {
    const f = Object.fromEntries(t.fields) as Record<string, unknown>;
    const from = num(f.ranking_from), to = num(f.ranking_to);
    if (from !== null && pos >= from && (to === null || pos <= to)) return t.rank;
  }
  return null;
}

export function parseCircles(body: unknown, offset: number, th: RankRow[]): CircleRow[] {
  return findList(body).flatMap((it, i) => {
    if (!it || typeof it !== "object") return [];
    const top = it as Record<string, unknown>;
    const inner = top.circle && typeof top.circle === "object" ? (top.circle as Record<string, unknown>) : {};
    const o = { ...inner, ...top };
    const rank = num(pick(o, ["live_rank", "monthly_rank", "rank", "ranking", "position"])) ?? offset + i + 1;
    const tierRaw = num(pick(o, ["club_rank", "rank_index", "tier"]));
    const tier = tierRaw !== null && tierRaw >= 1 && tierRaw <= 11 ? tierRaw : tierFromPosition(rank, th);
    return [{
      id: String(pick(o, ["circle_id", "id"]) ?? ""),
      name: String(pick(o, ["name", "circle_name"]) ?? "(tanpa nama)"),
      rank, tier,
      live: num(pick(o, ["live_points", "live_fans", "live_point"])),
      monthly: num(pick(o, ["monthly_point", "monthly_points", "monthly_fans"])),
      members: num(pick(o, ["member_count", "members"])),
      raw: o,
    }];
  });
}
