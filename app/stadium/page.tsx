"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Img from "@/components/Img";
import type { Names } from "@/components/TrainerCard";
import { charaImg, splitCharaId } from "@/lib/images";
import { DISTANCE, STYLE, type StadiumMember } from "@/lib/stadium";
import { tierOf } from "@/lib/rankscore";
import { EMPTY_SKILLS } from "@/lib/skills";

type Profile = { id: string; name: string; members: StadiumMember[] };
type Call = { ok: boolean; status: number; body: any };
const fmt = (n: number) => n.toLocaleString("en-US");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(id: string, values: Record<string, string>): Promise<Call> {
  const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, values }) });
  const d = await r.json();
  if ("status" in d) return { ok: d.ok, status: d.status, body: d.body };
  return { ok: false, status: r.status, body: d };
}

// Retry sekali kalau kena rate limit (429).
async function apiRetry(id: string, values: Record<string, string>) {
  let c = await api(id, values);
  if (c.status === 429) { await sleep(2500); c = await api(id, values); }
  return c;
}

export default function StadiumSearchPage() {
  const [score, setScore] = useState("24000");
  const [dist, setDist] = useState("1");
  const [pages, setPages] = useState("2");
  const [limit, setLimit] = useState("50");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [running, setRunning] = useState(false);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [prog, setProg] = useState({ done: 0, total: 0, failed: 0 });
  const [tick, setTick] = useState(0);
  const profiles = useRef<Map<string, Profile>>(new Map()); // cache: ganti filter tidak perlu fetch ulang
  const cancel = useRef(false);
  const [names, setNames] = useState<Names>({ chara: {}, card: {}, support: {}, skill: EMPTY_SKILLS });

  useEffect(() => {
    fetch("/api/lookup").then((r) => r.json()).then((d) => {
      if (d.error) return;
      const chara: Names["chara"] = {}; const card: Names["card"] = {};
      for (const t of d.trainees) { chara[t.id.slice(0, 4)] ??= t.name; card[t.id] = { name: t.name, title: t.title }; }
      setNames((n) => ({ ...n, chara, card }));
    }).catch(() => {});
  }, []);

  async function scan() {
    cancel.current = false; setRunning(true); setErr(""); setInfo("");
    const maxPages = Math.max(1, Math.min(50, Number(pages) || 1));
    let done = 0, failed = 0, total = 0, stop = "";
    setProg({ done, total, failed });
    try {
      for (let page = 0; page < maxPages && !cancel.current && !stop; page++) {
        const s = await apiRetry("search", { search_type: "all", limit, page: String(page) });
        if (!s.ok) { stop = `Search gagal (HTTP ${s.status}): ${typeof s.body === "string" ? s.body : JSON.stringify(s.body)}`; break; }
        const items: any[] = s.body?.items ?? [];
        if (!items.length) break;
        const todo = [...new Map(items.filter((it) => it.account_id).map((it) => [String(it.account_id), it])).values()]
          .filter((it) => !profiles.current.has(String(it.account_id)));
        total += todo.length; setProg({ done, total, failed });

        let next = 0;
        const worker = async () => {
          while (next < todo.length && !cancel.current && !stop) {
            const it = todo[next++];
            const id = String(it.account_id);
            const p = await apiRetry("profile", { account_id: id });
            if (p.ok) {
              profiles.current.set(id, { id, name: p.body?.trainer?.name || it.trainer_name || "", members: p.body?.team_stadium ?? [] });
            } else if (p.status === 429 || p.status === 401 || p.status === 403) {
              stop = `Berhenti: HTTP ${p.status} saat memuat profil. ${p.status === 429 ? "Kena rate limit, coba lagi nanti atau kurangi jumlah halaman." : "Cek API key."}`;
            } else failed++;
            done++; setProg({ done, total, failed }); setTick((t) => t + 1);
          }
        };
        await Promise.all(Array.from({ length: 4 }, worker)); // 4 permintaan paralel
        if (page + 1 >= (s.body?.total_pages ?? Infinity)) break;
      }
      if (stop) setErr(stop);
      else if (cancel.current) setInfo("Dihentikan.");
    } catch (e) { setErr(String(e)); }
    setRunning(false);
  }

  const min = Number(score.replace(/\D/g, "")) || 0;
  const hits = useMemo(() => {
    const out: { key: string; p: Profile; m: StadiumMember }[] = [];
    for (const p of profiles.current.values())
      for (const m of p.members) if (m.distance_type === Number(dist) && m.rank_score >= min) out.push({ key: `${p.id}-${m.id}`, p, m });
    out.sort((a, b) => (order === "asc" ? a.m.rank_score - b.m.rank_score : b.m.rank_score - a.m.rank_score));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, min, dist, order]);

  const scanned = profiles.current.size;

  return (
    <main>
      <h1>Cari uma Team Stadium</h1>
      <Nav />
      <div className="grid">
        <section className="card">
          <label htmlFor="score">Minimal rank score</label>
          <input id="score" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} placeholder="mis. 24000" />
          <p className="empty" style={{ fontSize: 12, margin: "4px 0 0" }}>Rank minimal: {tierOf(min).name}</p>
          <label htmlFor="dist">Distance</label>
          <select id="dist" value={dist} onChange={(e) => setDist(e.target.value)}>
            {Object.entries(DISTANCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label htmlFor="order">Urutan skor</label>
          <select id="order" value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")}>
            <option value="asc">Terendah dulu (dari skor minimal)</option>
            <option value="desc">Tertinggi dulu</option>
          </select>
          <details style={{ marginTop: 12 }}>
            <summary>Cakupan pemindaian</summary>
            <label htmlFor="limit">Trainer per halaman</label>
            <select id="limit" value={limit} onChange={(e) => setLimit(e.target.value)}>{[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            <label htmlFor="pages">Jumlah halaman</label>
            <input id="pages" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} />
            <p className="empty" style={{ fontSize: 12 }}>Maks. ± {(Number(pages) || 1) * Number(limit)} profil dimuat. Makin besar, makin lama dan makin dekat ke rate limit.</p>
          </details>
          <button onClick={scan} disabled={running}>{running ? "Memindai…" : "Pindai trainer"}</button>
          {running && <button className="ghost" onClick={() => { cancel.current = true; }}>Hentikan</button>}
          {scanned > 0 && !running && <button className="ghost" onClick={() => { profiles.current.clear(); setTick((t) => t + 1); setProg({ done: 0, total: 0, failed: 0 }); }}>Kosongkan cache</button>}
        </section>

        <section style={{ minWidth: 0 }}>
          {err && <div className="card"><p style={{ color: "var(--bad)", margin: 0 }}>{err}</p></div>}
          <div className="meta">
            <span>Profil dipindai <b>{scanned}</b>{prog.total ? ` (${prog.done}/${prog.total} batch ini)` : ""}</span>
            {prog.failed > 0 && <span style={{ color: "var(--bad)" }}>Gagal <b>{prog.failed}</b></span>}
            <span>Cocok <b>{hits.length}</b></span>
            {info && <span className="empty">{info}</span>}
          </div>
          {scanned === 0 && !running && <div className="card"><p className="empty">Tekan “Pindai trainer”. Pencarian memuat trainer dari database friend lalu memeriksa Team Stadium tiap trainer. Ganti skor/distance setelahnya langsung menyaring ulang tanpa memuat ulang.</p></div>}
          {scanned > 0 && hits.length === 0 && !running && <div className="card"><p className="empty">Belum ada uma ≥ {fmt(min)} untuk {DISTANCE[Number(dist)]} di {scanned} trainer yang dipindai. Coba tambah halaman.</p></div>}
          <div className="results">
            {hits.slice(0, 300).map(({ key, p, m }) => {
              const ref = splitCharaId(m.card_id);
              const card = names.card[String(m.card_id)];
              const t = tierOf(m.rank_score);
              return (
                <article key={key} className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  {ref && <Img src={charaImg(ref)} alt={`Card ${m.card_id}`} className="rankicon big" />}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <b>{card?.name ?? names.chara[ref?.chara ?? ""] ?? `Card ${m.card_id}`}</b>
                    {card?.title && <div className="empty" style={{ fontSize: 12 }}>{card.title}</div>}
                    <div style={{ fontSize: 13, marginTop: 4 }}>Trainer: <b>{p.name || "—"}</b> · ID <code>{p.id}</code></div>
                    <div className="empty" style={{ fontSize: 12 }}>{DISTANCE[m.distance_type]} · {STYLE[m.running_style] ?? ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Img src={t.icon} alt={`Rank ${t.name}`} className="rankicon big" />
                    <div><b style={{ fontSize: 18 }}>{fmt(m.rank_score)}</b><div className="empty" style={{ fontSize: 12 }}>{t.name}</div></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
