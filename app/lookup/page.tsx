"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import type { Trainee, Support } from "@/lib/gametora";

type Tab = "trainee" | "support";
const PAGE = 200;

export default function LookupPage() {
  const [data, setData] = useState<{ trainees: Trainee[]; supports: Support[] } | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("trainee");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    fetch("/api/lookup")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e)));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    const list: (Trainee | Support)[] = tab === "trainee" ? data.trainees : data.supports;
    if (!s) return list;
    return list.filter((r) =>
      [r.id, r.name, r.nameJp, "title" in r ? r.title : r.type].some((v) => String(v).toLowerCase().includes(s))
    );
  }, [data, tab, q]);

  // Cek cepat: ID 6 digit di Team Stadium kemungkinan = support_id + digit limit break
  const quick = useMemo(() => {
    const id = q.trim();
    if (!data || !/^\d{5,8}$/.test(id)) return null;
    const t = data.trainees.find((x) => x.id === id);
    if (t) return `Trainee: ${t.name}${t.title ? ` [${t.title}]` : ""}`;
    const s = data.supports.find((x) => x.id === id);
    if (s) return `Support: ${s.name} (${s.rarity}, ${s.type})`;
    const s2 = id.length === 6 ? data.supports.find((x) => x.id === id.slice(0, -1)) : null;
    if (s2) return `Support (dugaan, LB ${id.slice(-1)}): ${s2.name} (${s2.rarity}, ${s2.type})`;
    return null;
  }, [data, q]);

  return (
    <main>
      <h1>Lookup nama card</h1>
      <Nav />
      <section className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {(["trainee", "support"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setLimit(PAGE); }}
              style={{ margin: 0, opacity: tab === t ? 1 : 0.55 }}>
              {t === "trainee" ? `Trainee (${data?.trainees.length ?? "…"})` : `Support card (${data?.supports.length ?? "…"})`}
            </button>
          ))}
        </div>
        <label htmlFor="q">Cari nama atau ID</label>
        <input id="q" value={q} placeholder="mis. 100201, Kitasan, SSR" onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
        {quick && <p style={{ margin: "10px 0 0", fontWeight: 600 }}>{quick}</p>}
        {err && <p style={{ color: "var(--bad)" }}>Gagal memuat data GameTora: {err}</p>}
        {!data && !err && <p className="empty">Memuat data…</p>}

        {data && (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th>ID</th><th>Nama</th><th>{tab === "trainee" ? "Judul" : "Rarity"}</th>
                  <th>{tab === "trainee" ? "Nama JP" : "Tipe"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ fontFamily: "ui-monospace,monospace" }}>{r.id}</td>
                    <td>{r.name}</td>
                    <td>{"title" in r ? r.title : r.rarity}</td>
                    <td>{"title" in r ? r.nameJp : r.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="empty">Menampilkan {Math.min(limit, rows.length)} dari {rows.length}.</p>
            {rows.length > limit && <button onClick={() => setLimit(limit + PAGE)}>Tampilkan lebih banyak</button>}
          </div>
        )}
      </section>
    </main>
  );
}
