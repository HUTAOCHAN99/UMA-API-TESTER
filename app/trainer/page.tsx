"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import TrainerCard, { type Names } from "@/components/TrainerCard";
import type { SearchResponse } from "@/lib/uma-types";
import { EMPTY_SKILLS, buildSkillIndex } from "@/lib/skills";

type Result = { url: string; status: number; ok: boolean; ms: number; body: unknown };

// [param, label, placeholder]
const ADV: [string, string, string][] = [
  ["main_parent_id", "Main parent (ID, pisah koma)", "mis. 1068,1001"],
  ["parent_id", "Parent kiri/kanan (ID, pisah koma)", ""],
  ["parent_rank", "Parent rank", ""],
  ["parent_rarity", "Parent rarity", ""],
  ["support_card_id", "Support card ID", "mis. 30028"],
  ["min_win_count", "Min win count", ""],
  ["min_white_count", "Min white count", ""],
  ["min_limit_break", "Min limit break", ""],
  ["max_limit_break", "Max limit break", ""],
  ["max_follower_num", "Max follower (999 = bisa friend request)", "999"],
  ["sort_by", "sort_by", ""],
];

export default function TrainerPage() {
  const [f, setF] = useState<Record<string, string>>({ search_type: "all", limit: "20" });
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<Names>({ chara: {}, card: {}, support: {}, skill: EMPTY_SKILLS })
  const [skillsInfo, setSkillsInfo] = useState("");
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));

  // Nama karakter & support dari GameTora (opsional; gambar tetap tampil kalau gagal)
  useEffect(() => {
    fetch("/api/lookup").then((r) => r.json()).then((d) => {
      if (d.error) return;
      const chara: Names["chara"] = {};
      const card: Names["card"] = {};
      for (const t of d.trainees) { chara[t.id.slice(0, 4)] ??= t.name; card[t.id] = { name: t.name, title: t.title }; }
      const support: Names["support"] = {};
      for (const s of d.supports) support[s.id] = { name: s.name, rarity: s.rarity, type: s.type };
      setNames({ chara, card, support, skill: buildSkillIndex(d.skills ?? []) });
      setSkillsInfo(d.skillsInfo ?? "");
    }).catch(() => {});
  }, []);

  async function search(page = 0) {
    setLoading(true);
    try {
      const r = await fetch("/api/uma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "search", values: { ...f, page: String(page) } }),
      });
      const data = await r.json();
      setRes("status" in data ? data : { url: "", status: r.status, ok: false, ms: 0, body: data });
    } catch (e) {
      setRes({ url: "", status: 0, ok: false, ms: 0, body: String(e) });
    } finally {
      setLoading(false);
    }
  }

  const body = res?.ok ? (res.body as SearchResponse) : null;
  const items = body?.items ?? [];
  const page = body?.page ?? 0;
  const pages = body?.total_pages ?? 0;
  const enter = (e: React.KeyboardEvent) => e.key === "Enter" && search(0);

  return (
    <main>
      <h1>Cari trainer</h1>
      <Nav />
      <div className="grid">
        <section className="card">
          <label htmlFor="trainer_id">ID trainer (9–12 digit)</label>
          <input id="trainer_id" inputMode="numeric" value={f.trainer_id ?? ""} onChange={(e) => set("trainer_id", e.target.value)} onKeyDown={enter} />
          <label htmlFor="trainer_name">Nama trainer (sebagian)</label>
          <input id="trainer_name" value={f.trainer_name ?? ""} onChange={(e) => set("trainer_name", e.target.value)} onKeyDown={enter} />
          <label htmlFor="search_type">Jenis data</label>
          <select id="search_type" value={f.search_type} onChange={(e) => set("search_type", e.target.value)}>
            <option value="all">Semua</option>
            <option value="inheritance">Inheritance</option>
            <option value="support_cards">Support card</option>
          </select>

          <details style={{ marginTop: 12 }}>
            <summary>Filter lanjutan</summary>
            {ADV.map(([k, label, ph]) => (
              <div key={k}>
                <label htmlFor={k}>{label}</label>
                <input id={k} placeholder={ph} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} onKeyDown={enter} />
              </div>
            ))}
            <label htmlFor="sort_order">sort_order</label>
            <select id="sort_order" value={f.sort_order ?? ""} onChange={(e) => set("sort_order", e.target.value)}>
              <option value="">(default)</option><option value="asc">asc</option><option value="desc">desc</option>
            </select>
            <label htmlFor="limit">Hasil per halaman</label>
            <select id="limit" value={f.limit} onChange={(e) => set("limit", e.target.value)}>
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </details>

          <button onClick={() => search(0)} disabled={loading}>{loading ? "Mencari…" : "Cari"}</button>
          {skillsInfo && skillsInfo !== "ok" && <p className="empty" style={{ fontSize: 12 }}>Nama/ikon skill tidak tersedia, ditampilkan sebagai ID. {skillsInfo}</p>}
        </section>

        <section style={{ minWidth: 0 }}>
          {!res && !loading && <div className="card"><p className="empty">Isi ID atau nama trainer, lalu tekan Cari.</p></div>}
          {loading && <div className="card"><p className="empty">Menunggu respons…</p></div>}

          {res && !loading && !res.ok && (
            <div className="card">
              <div className="meta">
                <span className="badge" style={{ background: "var(--bad)" }}>{res.status || "ERR"}</span>
                <span className="url">{res.url}</span>
              </div>
              <pre>{typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2)}</pre>
            </div>
          )}

          {body && !loading && (
            <>
              <div className="meta">
                <span className="badge" style={{ background: "var(--ok)" }}>{res!.status}</span>
                <span>{res!.ms} ms</span>
                <span>Total <b>{body.total ?? items.length}</b></span>
                <span>Halaman <b>{page + 1}</b>{pages ? ` / ${pages}` : ""}</span>
              </div>
              {items.length === 0 && <div className="card"><p className="empty">Tidak ada hasil.</p></div>}
              <div className="results">
                {items.map((it, i) => <TrainerCard key={`${it.account_id}-${i}`} item={it} names={names} />)}
              </div>
              {pages > 1 && (
                <div className="pager">
                  <button disabled={page <= 0} onClick={() => search(page - 1)}>Sebelumnya</button>
                  <button disabled={page + 1 >= pages} onClick={() => search(page + 1)}>Berikutnya</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
