// Data master dari GameTora (endpoint tidak resmi, sama seperti yang dipakai UmaTools).
// Alur: manifest -> hash per key -> /data/umamusume/<key>.<hash>.json
const BASE = "https://gametora.com";
const DAY = 60 * 60 * 24;

export type Trainee = { id: string; name: string; title: string; nameJp: string };
export type Support = { id: string; name: string; rarity: string; type: string; nameJp: string };

const RARITY: Record<number, string> = { 1: "R", 2: "SR", 3: "SSR" };

async function getJson(url: string) {
  const res = await fetch(url, { next: { revalidate: DAY }, headers: { "User-Agent": "uma-api-tester" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export async function loadLookup(): Promise<{ trainees: Trainee[]; supports: Support[] }> {
  const manifest = await getJson(`${BASE}/data/manifests/umamusume.json`);
  const url = (key: string) => {
    if (!manifest[key]) throw new Error(`Key "${key}" tidak ada di manifest GameTora`);
    return `${BASE}/data/umamusume/${key}.${manifest[key]}.json`;
  };
  const [chars, sups] = await Promise.all([getJson(url("character-cards")), getJson(url("support-cards"))]);

  const trainees: Trainee[] = (chars as any[])
    .filter((c) => c?.card_id && c?.name_en)
    .map((c) => ({
      id: String(c.card_id),
      name: c.name_en,
      title: String(c.title_en_gl || c.title || "").replace(/^\[(.+)\]$/, "$1").trim(),
      nameJp: c.name_jp || "",
    }));

  const supports: Support[] = (sups as any[])
    .filter((s) => s?.support_id)
    .map((s) => ({
      id: String(s.support_id),
      name: s.char_name || `Support #${s.support_id}`,
      rarity: RARITY[s.rarity] || "?",
      type: String(s.type || ""),
      nameJp: s.name_jp || "",
    }));

  return { trainees, supports };
}
