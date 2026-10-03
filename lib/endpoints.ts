export type Param = { name: string; path?: boolean; array?: boolean; placeholder?: string };
export type Endpoint = { id: string; path: string; label: string; params: Param[] };

// arrays = param bertipe array (nilai dipisah koma -> param berulang). Param lain dikirim apa adanya.
const q = (names: string[], arrays: string[] = []): Param[] =>
  names.map((name) => (arrays.includes(name) ? { name, array: true } : { name }));

export const ENDPOINTS: Endpoint[] = [
  { id: "search", path: "/api/v3/search", label: "Search inheritance / support card",
    params: q(["page", "limit", "search_type", "trainer_id", "trainer_name", "max_follower_num",
      "main_parent_id", "exclude_main_parent_id", "parent_id", "parent_left_id", "parent_right_id", "exclude_parent_id",
      "parent_rank", "parent_rarity",
      "blue_sparks", "pink_sparks", "green_sparks", "white_sparks",
      "min_win_count", "min_white_count", "support_card_id", "min_limit_break", "max_limit_break", "min_experience",
      "sort_by", "sort_order", "player_chara_id", "desired_main_chara_id"],
      ["main_parent_id", "exclude_main_parent_id", "parent_id", "parent_left_id", "parent_right_id",
       "exclude_parent_id", "blue_sparks", "pink_sparks", "green_sparks", "white_sparks"]) },
  { id: "count", path: "/api/v3/count", label: "Count search results",
    params: q(["search_type", "trainer_id", "trainer_name"]) },
  { id: "circle", path: "/api/v4/circles", label: "Circle detail (viewer_id atau circle_id)",
    params: q(["viewer_id", "circle_id", "month", "year"]) },
  { id: "circle-list", path: "/api/v4/circles/list", label: "Circle list / search",
    params: q(["page", "limit", "name", "min_members", "max_rank", "sort_by", "sort_dir", "query"]) },
  { id: "thresholds", path: "/api/v4/circles/rank-thresholds", label: "Circle rank thresholds", params: [] },
  { id: "rank-monthly", path: "/api/v4/rankings/monthly", label: "Ranking bulanan",
    params: q(["month", "year", "page", "limit", "query", "sort_by"]) },
  { id: "rank-alltime", path: "/api/v4/rankings/alltime", label: "Ranking all-time",
    params: q(["page", "limit", "query", "sort_by"]) },
  { id: "rank-gains", path: "/api/v4/rankings/gains", label: "Ranking gain 3d/7d/30d",
    params: q(["page", "limit", "query", "sort_by"]) },
  { id: "profile", path: "/api/v4/user/profile/{account_id}", label: "Profil trainer",
    params: [{ name: "account_id", path: true, placeholder: "9-12 digit" }] },
  { id: "veteran", path: "/api/v4/user/profile/veterans/{veteran_id}", label: "Veteran by UUID",
    params: [{ name: "veteran_id", path: true, placeholder: "uuid" }] },
  { id: "shame-hall", path: "/api/v4/shame/hall", label: "Shame hall",
    params: q(["page", "limit", "sort_by", "min_score", "min_days", "query"]) },
  { id: "shame-viewer", path: "/api/v4/shame/viewer/{viewer_id}", label: "Shame report viewer",
    params: [{ name: "viewer_id", path: true }, { name: "days" }] },
  { id: "health", path: "/api/health", label: "Health check", params: [] },
  { id: "ver", path: "/api/ver", label: "Versi server (publik)", params: [] },
  { id: "ver-history", path: "/api/ver/history", label: "Riwayat versi (publik)", params: [] },
];
