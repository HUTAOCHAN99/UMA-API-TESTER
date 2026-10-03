"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Img from "@/components/Img";
import { RANK_NAMES, parseRanks, rankIcon, type RankRow } from "@/lib/ranks";
import { findTotal, parseCircles, type CircleRow } from "@/lib/circles";

const fmt = (n: number | null) => (n === null ? "-" : n.toLocaleString("id-ID"));
const call = async (id: string, values: Record<string, string>) => {
  const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, values }) });
  return r.json();
};

export default function CirclesPage() {
  const [th, setTh] = useState<RankRow[]>([]);
  const [body, setBody] = useState<unknown>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [field, setField] = useState<"name" | "query">("name"); // parameter pencarian API

  // threshold dipakai untuk menentukan ikon tier dari posisi ranking
  useEffect(() => { call("thresholds", {}).then((d) => d.ok && setTh(parseRanks(d.body))).catch(() => {}); }, []);

  // Catatan: parameter page di API uma.moe dimulai dari 0, sedangkan tampilan tetap mulai dari 1.
  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const d = await call("circle-list", { page: String(page - 1), limit: String(limit), [field]: search, sort_by: sortBy });
      if (d.error) setErr(d.error);
      else if (!d.ok) setErr(`HTTP ${d.status}: ${typeof d.body === "string" ? d.body : JSON.stringify(d.body)}`);
      else setBody(d.body);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }, [page, limit, search, sortBy, field]);
  useEffect(() => { load(); }, [load]);

  const rows: CircleRow[] = useMemo(() => (body ? parseCircles(body, (page - 1) * limit, th) : []), [body, page, limit, th]);
  const total = body ? findTotal(body) : null;
  const lastPage = total !== null ? Math.max(1, Math.ceil(total / limit)) : null;
  const hasNext = lastPage !== null ? page < lastPage : rows.length >= limit;

  return (
    <main>
      <h1>Circle rank</h1>
      <Nav />
      <section className="card">
        <div className="cfilters">
          <div>
            <label htmlFor="cq">Cari nama circle</label>
            <input id="cq" value={query} placeholder="mis. Dynasty" onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(query.trim()); setPage(1); } }} />
          </div>
          <div>
            <label htmlFor="cf">Cari lewat</label>
            <select id="cf" value={field} onChange={(e) => { setField(e.target.value as "name" | "query"); setPage(1); }}>
              <option value="name">name</option>
              <option value="query">query</option>
            </select>
          </div>
          <div>
            <label htmlFor="cs">Urutkan (sort_by)</label>
            <input id="cs" value={sortBy} placeholder="kosong = default" onChange={(e) => { setSortBy(e.target.value.trim()); setPage(1); }} />
          </div>
          <div>
            <label htmlFor="cl">Per halaman</label>
            <select id="cl" value={limit} onChange={(e) => { setLimit(+e.target.value); setPage(1); }}>
              {[20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="ghost" onClick={() => { setSearch(query.trim()); setPage(1); }} disabled={loading}>{loading ? "Memuat…" : "Cari"}</button>
        </div>

        {err && <p style={{ color: "var(--bad)" }}>Gagal memuat: {err}</p>}
        <p className="teamtotal" style={{ margin: "12px 0 0" }}>
          Halaman <b>{page}</b>{lastPage ? ` / ${lastPage}` : ""}{total !== null ? ` · ${fmt(total)} circle` : ""}
        </p>

        <div className="ranks">
          {rows.map((c) => (
            <div key={`${c.id}-${c.rank}`} className="rankrow circlerow">
              <span className="cpos">#{fmt(c.rank)}</span>
              {c.tier ? <Img src={rankIcon(c.tier)} alt={`Rank ${RANK_NAMES[c.tier - 1]}`} className="rankicon" />
                : <div className="rankicon noimg">-</div>}
              <div className="cname">
                <b>{c.name}</b>
                <span>{c.tier ? `Tier ${RANK_NAMES[c.tier - 1]}` : "Tier -"}{c.id && <> · <code>{c.id}</code></>}{c.members !== null && ` · ${c.members} member`}</span>
              </div>
              <div className="cfans">
                <span>Live fans</span><b>{fmt(c.live)}</b>
                {c.monthly !== null && <span className="cmonthly">Monthly {fmt(c.monthly)}</span>}
              </div>
            </div>
          ))}
          {!loading && !err && body !== null && rows.length === 0 && <p className="empty">Tidak ada circle di halaman ini.</p>}
          {loading && rows.length === 0 && <p className="empty">Memuat…</p>}
        </div>

        <div className="pager">
          <button className="ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>← Sebelumnya</button>
          <button className="ghost" disabled={!hasNext || loading} onClick={() => setPage(page + 1)}>Berikutnya →</button>
        </div>

        {body !== null && (
          <details style={{ marginTop: 12 }}>
            <summary>Response mentah</summary>
            <pre>{JSON.stringify(body, null, 2)}</pre>
          </details>
        )}
      </section>
    </main>
  );
}
