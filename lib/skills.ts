// Skill & unique skill: nama dan ikon dari data GameTora.
// Ikon: https://media.gametora.com/umamusume/skills/icon/<iconid>.png  (iconid != skill id, diambil dari data skill)
export type SkillInfo = { id: string; name: string; icon: string | null; group: string | null; rarity: number | null };
export type SkillIndex = { byId: Record<string, SkillInfo>; byGroup: Record<string, SkillInfo> };
export const EMPTY_SKILLS: SkillIndex = { byId: {}, byGroup: {} };

export const skillIconUrl = (icon: string | number) => `https://media.gametora.com/umamusume/skills/icon/${icon}.png`;

export function buildSkillIndex(list: SkillInfo[]): SkillIndex {
  const idx: SkillIndex = { byId: {}, byGroup: {} };
  for (const s of list) {
    idx.byId[s.id] = s;
    // satu group bisa berisi versi ○ dan ◎; ambil id terkecil
    if (s.group && (!idx.byGroup[s.group] || Number(s.id) < Number(idx.byGroup[s.group].id))) idx.byGroup[s.group] = s;
  }
  return idx;
}

// Daftar skill di Team Stadium: 7 digit = <skill_id 6 digit><level 1 digit>, mis. 2003311 -> skill 200331 lv 1
export function splitSkill(raw: number) {
  return { id: String(Math.floor(raw / 10)), level: raw % 10 };
}

// Unique skill diturunkan dari card_id (pola dari data profil):
//   100201 -> 100021, 100901 -> 100091, 103802 -> 110381, 103402 -> 110341
// = 100000 + (costume-1)*10000 + (chara_id % 1000)*10 + 1
export function uniqueSkillId(cardId: number | string): string | null {
  const s = String(cardId).replace(/\D/g, "");
  if (s.length !== 6) return null;
  const chara = Number(s.slice(0, 4));
  const costume = Number(s.slice(4));
  if (!costume) return null;
  return String(100000 + (costume - 1) * 10000 + (chara % 1000) * 10 + 1);
}

// White spark: <group skill 5 digit><bintang 2 digit>; cari lewat group_id, lalu id <group>1 / <group>2
export function skillByWhiteBase(idx: SkillIndex, base: number): SkillInfo | undefined {
  return idx.byGroup[String(base)] ?? idx.byId[String(base * 10 + 1)] ?? idx.byId[String(base * 10 + 2)];
}
