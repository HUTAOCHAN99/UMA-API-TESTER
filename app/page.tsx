"use client";
import { useState } from "react";
import Nav from "@/components/Nav";
import { ENDPOINTS } from "@/lib/endpoints";

type Result = { url: string; status: number; ok: boolean; ms: number; body: unknown };

export default function Page() {
  const [id, setId] = useState(ENDPOINTS[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const ep = ENDPOINTS.find((e) => e.id === id)!;

  async function send() {
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/uma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, values }),
      });
      const data = await r.json();
      // error validasi dari route (tanpa field status) ditampilkan apa adanya
      setRes("status" in data ? data : { url: "", status: r.status, ok: false, ms: 0, body: data });
    } catch (e) {
      setRes({ url: "", status: 0, ok: false, ms: 0, body: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>uma.moe API tester</h1>
      <Nav />
      <div className="grid">
        <section className="card">
          <label htmlFor="ep">Endpoint</label>
          <select id="ep" value={id} onChange={(e) => { setId(e.target.value); setValues({}); setRes(null); }}>
            {ENDPOINTS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <div className="url" style={{ marginTop: 6 }}>GET {ep.path}</div>

          {ep.params.map((p) => (
            <div key={p.name}>
              <label htmlFor={p.name}>{p.name}{p.path ? " (wajib)" : ""}</label>
              <input
                id={p.name}
                value={values[p.name] ?? ""}
                placeholder={p.placeholder}
                onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
            </div>
          ))}
          {ep.params.length === 0 && <p className="empty">Tidak ada parameter.</p>}
          <button onClick={send} disabled={loading}>{loading ? "Mengirim…" : "Kirim request"}</button>
        </section>

        <section className="card">
          {!res && !loading && <p className="empty">Pilih endpoint lalu kirim request. Hasil JSON muncul di sini.</p>}
          {loading && <p className="empty">Menunggu respons…</p>}
          {res && (
            <>
              <div className="meta">
                <span className="badge" style={{ background: res.ok ? "var(--ok)" : "var(--bad)" }}>{res.status || "ERR"}</span>
                <span>{res.ms} ms</span>
                <span className="url">{res.url}</span>
              </div>
              <pre>{typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2)}</pre>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
