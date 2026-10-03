// Data master dari GameTora (endpoint tidak resmi, sama seperti yang dipakai UmaTools).
// Alur: manifest -> hash per key -> /data/umamusume/<key>.<hash>.json
const BASE = "https://gametora.com";
const DAY = 60 * 60 * 24;

export type Trainee = { id: string; name: string; title: string; nameJp: string };
export type Skill = { id: string; name: string; icon: string | null; group: string | null; rarity: number | null };
export type Support = { id: string; name: string; rarity: string; type: string; nameJp: string };

const RARITY: Record<number, string> = { 1: "R", 2: "SR", 3: "SSR" };

async function getJson(url: string) {
  const res = await fetch(url, { next: { revalidate: DAY }, headers: { "User-Agent": "uma-api-tester" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export async function loadLookup(): Promise<{ trainees: Trainee[]; supports: Support[]; skills: Skill[]; skillsInfo: string }> {
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

  const { skills, skillsInfo } = await loadSkills(manifest, url);
  return { trainees, supports, skills, skillsInfo };
}

// Format data skill GameTora belum terverifikasi: dibuat toleran, dan gagal tidak mengganggu data lain.
async function loadSkills(manifest: Record<string, string>, url: (k: string) => string) {
  try {
    const key = Object.keys(manifest).find((k) => /^skills?(-data)?$/.test(k));
    if (!key) return { skills: [] as Skill[], skillsInfo: `Key skill tidak ada di manifest (key tersedia: ${Object.keys(manifest).join(", ")})` };
    const raw = await getJson(url(key));
    const arr: any[] = Array.isArray(raw) ? raw : Object.values(raw ?? {});
    const skills: Skill[] = arr
      .map((s) => {
        const id = s?.id ?? s?.skill_id;
        const icon = s?.iconid ?? s?.icon_id ?? s?.icon;
        const group = s?.group_id ?? s?.gene_id;
        return {
          id: String(id ?? ""),
          name: String(s?.name_en || s?.enname || s?.name || s?.name_jp || ""),
          icon: icon != null ? String(icon) : null,
          group: group != null ? String(group) : null,
          rarity: typeof s?.rarity === "number" ? s.rarity : null,
        };
      })
      .filter((s) => s.id && s.name);
    if (!skills.length) return { skills, skillsInfo: `Data "${key}" termuat tapi field id/nama tidak dikenali. Field contoh: ${Object.keys(arr[0] ?? {}).join(", ")}` };
    return { skills, skillsInfo: "ok" };
  } catch (e) {
    return { skills: [] as Skill[], skillsInfo: `Gagal memuat data skill: ${String(e)}` };
  }
}
