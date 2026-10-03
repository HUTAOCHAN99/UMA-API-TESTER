// URL gambar dari GameTora.
// Support card : https://media.gametora.com/umamusume/supports/full/small/<support_card_id>.png
// Karakter     : https://gametora.com/images/umamusume/characters/chara_stand_<chara_id>_<chara_id><costume>.png
//   contoh     : chara_stand_1068_106801.png  (chara 1068, costume 01)

export const supportImg = (id: number | string) =>
  `https://media.gametora.com/umamusume/supports/full/small/${id}.png`;

export type CharaRef = { chara: string; card: string };

// API bisa memberi ID karakter (4 digit, mis. 1068) atau card ID (6 digit, mis. 106801).
// Dua-duanya dinormalisasi ke { chara, card }. Costume default = 01.
export function splitCharaId(raw: unknown): CharaRef | null {
  const s = String(raw ?? "").replace(/\D/g, "");
  if (!s || /^0+$/.test(s)) return null;
  if (s.length <= 4) {
    const chara = s.padStart(4, "0");
    return { chara, card: `${chara}01` };
  }
  return { chara: s.slice(0, 4), card: s.slice(0, 6) };
}

export const charaImg = ({ chara, card }: CharaRef) =>
  `https://gametora.com/images/umamusume/characters/chara_stand_${chara}_${card}.png`;
