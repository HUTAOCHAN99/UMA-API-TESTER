// Tier rank score karakter (Team Stadium / hasil training), urut naik. Indeks array = nomor file ikon.
// 00 = G, 01 = G+, ... 17 = SS+, 18 = UG, 19 = UG1 ... 97 = US9.
const BASE: [string, number][] = [
  ["G", 0], ["G+", 300], ["F", 600], ["F+", 900], ["E", 1300], ["E+", 1800], ["D", 2300], ["D+", 2900],
  ["C", 3500], ["C+", 4900], ["B", 6500], ["B+", 8200], ["A", 10000], ["A+", 12100],
  ["S", 14500], ["S+", 15900], ["SS", 17500], ["SS+", 19200],
];
// UG..US: tiap grup = 10 tier (tanpa angka, lalu 1..9)
const U: [string, number[]][] = [
  ["UG", [19600, 20000, 20400, 20800, 21200, 21600, 22100, 22500, 23000, 23400]],
  ["UF", [23900, 24300, 24800, 25300, 25800, 26300, 26800, 27300, 27800, 28300]],
  ["UE", [28800, 29400, 29900, 30400, 31000, 31500, 32100, 32700, 33200, 33800]],
  ["UD", [34400, 35000, 35600, 36200, 36800, 37500, 38100, 38700, 39400, 40000]],
  ["UC", [40700, 41300, 42000, 42700, 43400, 44000, 44700, 45400, 46200, 46900]],
  ["UB", [47600, 48300, 49000, 49800, 50500, 51300, 52000, 52800, 53600, 54400]],
  ["UA", [55200, 55900, 56700, 57500, 58400, 59200, 60000, 60800, 61700, 62500]],
  ["US", [63400, 64200, 65100, 66400, 67700, 69000, 70300, 71600, 72900, 74400]],
];

export type Tier = { index: number; name: string; min: number; icon: string };

export const rankScoreIcon = (index: number) =>
  `https://uma.moe/assets/images/icon/ranks/utx_txt_rank_${String(index).padStart(2, "0")}.webp`;

export const TIERS: Tier[] = [
  ...BASE.map(([name, min]) => [name, min] as [string, number]),
  ...U.flatMap(([p, arr]) => arr.map((min, i) => [i === 0 ? p : `${p}${i}`, min] as [string, number])),
].map(([name, min], index) => ({ index, name, min, icon: rankScoreIcon(index) }));

// Tier tertinggi yang threshold-nya <= score
export function tierOf(score: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (score >= x.min) t = x; else break;
  return t;
}
