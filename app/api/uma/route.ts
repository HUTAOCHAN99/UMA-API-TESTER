import { NextRequest, NextResponse } from "next/server";
import { ENDPOINTS } from "@/lib/endpoints";

const BASE = "https://uma.moe";

export async function POST(req: NextRequest) {
  const key = process.env.UMA_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "UMA_API_KEY belum diset di .env.local" }, { status: 500 });
  }

  const { id, values = {} } = (await req.json()) as { id: string; values: Record<string, string> };
  const ep = ENDPOINTS.find((e) => e.id === id); // whitelist endpoint
  if (!ep) return NextResponse.json({ error: "Endpoint tidak dikenal" }, { status: 400 });

  let path = ep.path;
  const qs = new URLSearchParams();
  for (const p of ep.params) {
    const v = (values[p.name] ?? "").trim();
    if (p.path) {
      if (!v) return NextResponse.json({ error: `${p.name} wajib diisi` }, { status: 400 });
      path = path.replace(`{${p.name}}`, encodeURIComponent(v));
    } else if (v) {
      // hanya param array yang dipisah koma -> param berulang (trainer_name boleh mengandung koma)
      if (p.array) v.split(",").forEach((x) => x.trim() && qs.append(p.name, x.trim()));
      else qs.append(p.name, v);
    }
  }
  const query = qs.toString();
  const url = `${BASE}${path}${query ? `?${query}` : ""}`;

  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch {}
    return NextResponse.json({ url, status: res.status, ok: res.ok, ms: Date.now() - t0, body });
  } catch (e) {
    return NextResponse.json({ url, status: 0, ok: false, ms: Date.now() - t0, body: String(e) }, { status: 502 });
  }
}
