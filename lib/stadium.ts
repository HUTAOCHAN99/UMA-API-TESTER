// Dekoder data Team Stadium / spark. Pola diturunkan dari contoh respons /api/v4/user/profile/{account_id}.
export const DISTANCE: Record<number, string> = { 1: "Sprint", 2: "Mile", 3: "Classic", 4: "Long", 5: "Dirt" };
export const STYLE: Record<number, string> = { 1: "Front Runner", 2: "Pace Chaser", 3: "Late Surger", 4: "End Closer" };
const APT = ["-", "G", "F", "E", "D", "C", "B", "A", "S"]; // proper_* : 1=G ... 8=S
export const apt = (n: number) => APT[n] ?? String(n);

const BLUE: Record<number, string> = { 1: "Speed", 2: "Stamina", 3: "Power", 4: "Guts", 5: "Wit" };
const PINK: Record<number, string> = {
  11: "Turf", 12: "Dirt", 21: "Front Runner", 22: "Pace Chaser", 23: "Late Surger", 24: "End Closer",
  31: "Sprint", 32: "Mile", 33: "Medium", 34: "Long",
};

export type Factor = { kind: "blue" | "pink" | "green" | "white"; base: number; stars: number; label: string };

// blue  : 3 digit   -> <tipe 1-5><bintang 2 digit>        401  = Guts 1★
// pink  : 4 digit   -> <tipe 2 digit><bintang 2 digit>    1102 = Turf 2★
// green : 8 digit   -> <card_id 6 digit><bintang 2 digit> 10020102 = unique card 100201, 2★
// white : 7 digit   -> <id skill-group><bintang 2 digit>  (nama skill tidak ada di dokumentasi)
export function decodeFactor(id: number): Factor {
  const s = String(id);
  const stars = id % 100;
  const base = Math.floor(id / 100);
  if (s.length <= 3 && BLUE[base]) return { kind: "blue", base, stars, label: BLUE[base] };
  if (s.length === 4 && PINK[base]) return { kind: "pink", base, stars, label: PINK[base] };
  if (s.length === 8) return { kind: "green", base, stars, label: "Unique" };
  return { kind: "white", base, stars, label: `#${base}` };
}

// Support di Team Stadium: 6 digit = <support_id 5 digit><limit break 1 digit>, mis. 300284 -> 30028, LB 4
export function splitSupport(raw: number) {
  const s = String(raw);
  return s.length === 6 ? { id: s.slice(0, 5), lb: Number(s[5]) } : { id: s, lb: null as number | null };
}

export type StadiumMember = {
  id: number; distance_type: number; member_id: number; trained_chara_id: number; running_style: number;
  card_id: number; speed: number; power: number; stamina: number; wiz: number; guts: number; fans: number;
  rank_score: number; skills: number[]; creation_time: string; scenario_id: number; factors: number[];
  support_cards: number[]; rarity: number; talent_level: number;
  proper_ground_turf: number; proper_ground_dirt: number;
  proper_running_style_nige: number; proper_running_style_senko: number;
  proper_running_style_sashi: number; proper_running_style_oikomi: number;
  proper_distance_short: number; proper_distance_mile: number;
  proper_distance_middle: number; proper_distance_long: number;
};
