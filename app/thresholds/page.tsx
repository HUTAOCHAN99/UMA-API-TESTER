"use client";
import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Img from "@/components/Img";
import { RANK_NAMES, parseRanks, rankIcon, type RankRow } from "@/lib/ranks";

const fmt = (v: unknown) => (v === null || v === undefined ? "-" : typeof v === "number" ? v.toLocaleString("id-ID") : typeof v === "object" ? JSON.stringify(v) : String(v ?? "-"));

export default function ThresholdsPage() {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [raw, setRaw] = useState<unknown>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("asc"); // asc = D→SS (dari bawah), desc = SS→D (dari atas)

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "thresholds", values: {} }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else if (!d.ok) setErr(`HTTP ${d.status}: ${typeof d.body === "string" ? d.body : JSON.stringify(d.body)}`);
      else { setRaw(d.body); setRows(parseRanks(d.body)); }
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Selalu tampilkan 11 tier D..SS; data dari API diisi jika ada.
  const tiers = RANK_NAMES.map((name, i) => rows.find((r) => r.rank === i + 1) ?? { rank: i + 1, name, icon: rankIcon(i + 1), fields: [] as [string, unknown][] });

  const shown = order === "asc" ? tiers : [...tiers].reverse();

  return (
    <main>
      <h1>Rank thresholds</h1>
      <Nav />
      <section className="card">
        <div className="teamhead">
          <span className="teamtotal">Tier circle {order === "asc" ? "D → SS" : "SS → D"} ({RANK_NAMES.length} rank)</span>
          <div className="seg" role="group" aria-label="Urutan">
            <button className={order === "asc" ? "ghost on" : "ghost"} aria-pressed={order === "asc"} onClick={() => setOrder("asc")}>Dari bawah (D → SS)</button>
            <button className={order === "desc" ? "ghost on" : "ghost"} aria-pressed={order === "desc"} onClick={() => setOrder("desc")}>Dari atas (SS → D)</button>
            <button className="ghost" onClick={load} disabled={loading}>{loading ? "Memuat…" : "Muat ulang"}</button>
          </div>
        </div>
        {err && <p style={{ color: "var(--bad)" }}>Gagal memuat: {err}</p>}
        <div className="ranks">
          {shown.map((t) => (
            <div key={t.rank} className="rankrow">
              <Img src={t.icon} alt={`Rank ${t.name}`} className="rankicon" />
              <div className="rankname"><b>{t.name}</b><span>#{t.rank}</span></div>
              <div className="rankstats">
                {t.fields.length === 0 ? <span className="empty">{loading ? "…" : "tidak ada data"}</span>
                  : t.fields.map(([k, v]) => <span key={k} className="stat"><span>{k}</span><b>{fmt(v)}</b></span>)}
              </div>
            </div>
          ))}
        </div>
        {raw !== null && (
          <details style={{ marginTop: 12 }}>
            <summary>Response mentah</summary>
            <pre>{JSON.stringify(raw, null, 2)}</pre>
          </details>
        )}
      </section>
    </main>
  );
}
