// Nama circle/trainer sering memakai tanda baca fullwidth (［HCM］, A．Z．A．N) yang berbeda karakter dari ASCII ([HCM], A.Z.A.N).
// API mencocokkan nama secara harfiah, jadi pencarian dicoba dengan beberapa varian.
const PUNCT = /[!-/:-@[-`{-~ ]/g; // tanda baca ASCII + spasi
const full = (c: string) => (c === " " ? "\u3000" : String.fromCharCode(c.charCodeAt(0) + 0xfee0));
const BRACKETS = /[[\](){}<>［］（）｛｝＜＞「」『』【】]/g;

// Urutan: tulisan asli, semua tanda baca fullwidth, semua ASCII, kombinasi campuran (maks. 3 jenis tanda baca), tanpa kurung (paling luas).
export function nameVariants(q: string): string[] {
  const base = q.normalize("NFKC"); // fullwidth -> ASCII
  const types = Array.from(new Set(base.match(PUNCT) ?? []));
  const out: string[] = [q];
  const build = (mask: number) => base.replace(PUNCT, (c) => (mask & (1 << types.indexOf(c)) ? full(c) : c));
  if (types.length > 0 && types.length <= 3) {
    const all = (1 << types.length) - 1;
    out.push(build(all), build(0));
    for (let m = 1; m < all; m++) out.push(build(m));
  } else if (types.length > 3) {
    out.push(base.replace(PUNCT, full), base);
  } else {
    out.push(base);
  }
  out.push(base.replace(BRACKETS, "").trim());
  return Array.from(new Set(out)).filter(Boolean);
}