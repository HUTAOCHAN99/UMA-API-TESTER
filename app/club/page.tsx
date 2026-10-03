"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Img from "@/components/Img";
import { RANK_NAMES, rankIcon } from "@/lib/ranks";
import { parseClub, type Club } from "@/lib/club";
import { parseCircles, findTotal, type CircleRow } from "@/lib/circles";

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "-" : n.toLocaleString("id-ID"));
const sgn = (n: number | null) => (n === null ? "-" : (n > 0 ? "+" : "") + n.toLocaleString("id-ID"));
type SortKey = "monthGain" | "lastDayGain" | "avgPerDay" | "total" | "updated";
const ts = (v: string | null) => { const t = v ? Date.parse(v) : NaN; return isNaN(t) ? null : t; };
function ago(t: number | null, now: number) {
  if (t === null) return "-";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
// warna titik: hijau <15 mnt, kuning <2 jam, abu-abu lebih lama
const fresh = (t: number | null, now: number) => (t === null ? "#888" : now - t < 15 * 60e3 ? "#2ecc71" : now - t < 2 * 3600e3 ? "#f1c40f" : "#888");

export default function ClubPage() {
  const [idInput, setIdInput] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [club, setClub] = useState<Club | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("monthGain");
  const [results, setResults] = useState<CircleRow[] | null>(null);
  const [resTotal, setResTotal] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [auto, setAuto] = useState(0); // detik, 0 = mati
  const [now, setNow] = useState(() => Date.now());
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const base = useRef<Record<string, number>>({}); // total fans saat pertama dibuka
  const prev = useRef<Record<string, number>>({}); // total fans pada refresh sebelumnya
  const activeId = useRef("");

  const load = useCallback(async (circleId: string, silent = false) => {
    if (!/^\d+$/.test(circleId)) { setErr("Circle ID harus berupa angka"); return; }
    if (!silent) { setLoading(true); setErr(""); setClub(null); }
    try {
      const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "circle", values: { circle_id: circleId, year, month } }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else if (!d.ok) setErr(`HTTP ${d.status}: ${typeof d.body === "string" ? d.body : JSON.stringify(d.body)}`);
      else {
        setRaw(d.body); const c = parseClub(d.body);
        if (!c) setErr("Response tidak dikenali");
        else {
          if (!silent || activeId.current !== circleId) { base.current = {}; prev.current = {}; activeId.current = circleId; }
          const ch = new Set<string>();
          c.members.forEach((m) => {
            if (m.total === null) return;
            if (!(m.viewerId in base.current)) base.current[m.viewerId] = m.total;
            if (m.viewerId in prev.current && prev.current[m.viewerId] !== m.total) ch.add(m.viewerId);
            prev.current[m.viewerId] = m.total;
          });
          setChanged(ch); setClub(c); setFetchedAt(Date.now()); setErr("");
        }
      }
    } catch (e) { setErr(String(e)); }
    if (!silent) setLoading(false);
  }, [year, month]);

  // Angka saja = Circle ID. Selain itu dianggap nama circle (pencarian sebagian lewat /api/v4/circles/list?name=).
  const go = useCallback(async (input: string) => {
    const q = input.trim();
    if (!q) { setErr("Isi Circle ID atau nama circle"); return; }
    if (/^\d+$/.test(q)) { setResults(null); load(q); return; }
    setSearching(true); setErr(""); setClub(null); setResults(null);
    try {
      const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "circle-list", values: { page: "0", limit: "20", name: q } }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else if (!d.ok) setErr(`HTTP ${d.status}: ${typeof d.body === "string" ? d.body : JSON.stringify(d.body)}`);
      else {
        const rows = parseCircles(d.body, 0, []);
        setResTotal(findTotal(d.body));
        if (rows.length === 1) { setIdInput(rows[0].id); load(rows[0].id); }
        else if (rows.length === 0) setErr(`Tidak ada circle dengan nama "${q}"`);
        else setResults(rows);
      }
    } catch (e) { setErr(String(e)); }
    setSearching(false);
  }, [load]);

  // buka otomatis kalau datang dari tab Circle rank (?id=...)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { setIdInput(id); load(id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!auto || !club) return;
    const t = setInterval(() => load(activeId.current, true), auto * 1000);
    return () => clearInterval(t);
  }, [auto, club, load]);

  const val = (m: Club["members"][number]) => (sort === "updated" ? ts(m.updated) : m[sort]) ?? -Infinity;
  const members = useMemo(() => (club ? [...club.members].sort((a, b) => val(b) - val(a)) : []), [club, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const sumGain = club?.members.reduce((s, m) => s + (m.monthGain ?? 0), 0) ?? 0;

  return (
    <main>
      <h1>Detail club</h1>
      <Nav />
      <section className="card">
        <div className="cfilters clubform">
          <div>
            <label htmlFor="cid">Circle ID atau nama</label>
            <input id="cid" value={idInput} placeholder="mis. 574559219 atau Dynasty" onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go(idInput)} />
          </div>
          <div><label htmlFor="cy">Tahun (opsional)</label><input id="cy" inputMode="numeric" value={year} placeholder="2026" onChange={(e) => setYear(e.target.value.trim())} /></div>
          <div><label htmlFor="cm">Bulan 1-12 (opsional)</label><input id="cm" inputMode="numeric" value={month} placeholder="10" onChange={(e) => setMonth(e.target.value.trim())} /></div>
          <button className="ghost" onClick={() => go(idInput)} disabled={loading || searching}>{loading || searching ? "Memuat…" : "Lihat"}</button>
        </div>
        {err && <p style={{ color: "var(--bad)" }}>Gagal memuat: {err}</p>}
      </section>

      {results && (
        <section className="card" style={{ marginTop: 12 }}>
          <span className="teamtotal">{resTotal !== null && resTotal > results.length ? `${results.length} dari ${fmt(resTotal)} hasil (persempit nama untuk hasil lebih spesifik)` : `${results.length} hasil`}</span>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table className="mtable">
              <thead><tr><th>Circle</th><th>Rank</th><th>Member</th><th>Live fans</th><th></th></tr></thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><div className="msub"><code>{c.id}</code></div></td>
                    <td>{c.tier ? <Img src={rankIcon(c.tier)} alt={RANK_NAMES[c.tier - 1]} className="rankicon" /> : null} #{fmt(c.rank)}</td>
                    <td>{fmt(c.members)}</td>
                    <td>{fmt(c.live ?? c.monthly)}</td>
                    <td><button className="ghost" onClick={() => { setIdInput(c.id); setResults(null); load(c.id); }}>Buka</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {club && (
        <>
          <section className="card" style={{ marginTop: 12 }}>
            <div className="clubhead">
              {club.tier ? <Img src={rankIcon(club.tier)} alt={`Rank ${RANK_NAMES[club.tier - 1]}`} className="rankicon big" /> : <div className="rankicon big noimg">-</div>}
              <div className="clubinfo">
                <h2 style={{ margin: 0 }}>{club.name}</h2>
                <div className="tmeta">
                  <span>Circle ID <b>{club.id}</b></span>
                  <span>ID leader <b>{club.leaderId || "-"}</b>{club.leaderName && ` (${club.leaderName})`}</span>
                  <span>Member <b>{club.memberCount ?? club.members.length}</b></span>
                  {club.tier && <span>Tier <b>{RANK_NAMES[club.tier - 1]}</b></span>}
                </div>
              </div>
            </div>
            <div className="stats">
              <div className="stat"><span>Live fans</span><b>{fmt(club.livePoints)}</b></div>
              <div className="stat"><span>Monthly fans</span><b>{fmt(club.monthlyPoint)}</b></div>
              <div className="stat"><span>Rank live</span><b>{club.liveRank !== null ? `#${fmt(club.liveRank)}` : "-"}</b></div>
              <div className="stat"><span>Rank bulanan</span><b>{club.monthlyRank !== null ? `#${fmt(club.monthlyRank)}` : "-"}</b></div>
              <div className="stat"><span>Ke tier atas</span><b>{fmt(club.toNext)}</b></div>
              <div className="stat"><span>Buffer tier bawah</span><b>{fmt(club.toLower)}</b></div>
              <div className="stat"><span>Total gain member</span><b>{fmt(sumGain)}</b></div>
              <div className="stat"><span>Update terakhir</span><b>{club.lastUpdated ? new Date(club.lastUpdated).toLocaleString("id-ID") : "-"}</b></div>
            </div>
          </section>

          <section className="card" style={{ marginTop: 12 }}>
            <div className="teamhead">
              <span className="teamtotal">Member ({club.members.length})</span>
              <div className="seg">
                {([["monthGain", "Gain bulan ini"], ["lastDayGain", "Gain terakhir"], ["avgPerDay", "Rata-rata/hari"], ["total", "Total fans"], ["updated", "Terbaru diupdate"]] as [SortKey, string][]).map(([k, l]) => (
                  <button key={k} className={sort === k ? "ghost on" : "ghost"} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="tmeta" style={{ marginTop: 10, alignItems: "center" }}>
              <label htmlFor="auto" style={{ margin: 0 }}>Auto-refresh</label>
              <select id="auto" value={auto} onChange={(e) => setAuto(+e.target.value)}>
                <option value={0}>Mati</option><option value={30}>30 dtk</option><option value={60}>1 menit</option><option value={300}>5 menit</option>
              </select>
              <button className="ghost" onClick={() => load(activeId.current, true)}>Refresh sekarang</button>
              <span>Diambil <b>{ago(fetchedAt, now)}</b></span>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="mtable">
                <thead><tr><th>#</th><th>Member</th><th>Total fans</th><th>Gain bulan ini</th><th>Gain terakhir</th><th>Rata-rata/hari</th><th>Update member</th></tr></thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={m.viewerId || i}>
                      <td>{i + 1}</td>
                      <td>
                        <b>{m.name}</b>{m.isLeader && <span className="mbadge" style={{ marginLeft: 6 }}>Leader</span>}
                        <div className="msub"><code>{m.viewerId}</code></div>
                        {m.days.length > 0 && (
                          <details><summary>Gain harian</summary>
                            <div className="daygains">{m.days.map((d) => <span key={d.day} className="chip">H{d.day}: <b>{sgn(d.gain)}</b></span>)}</div>
                          </details>
                        )}
                      </td>
                      <td>
                        {fmt(m.total)}
                        {m.total !== null && m.viewerId in base.current && m.total !== base.current[m.viewerId] && (
                          <div className="msub" style={{ color: "var(--good, #2ecc71)" }}>{sgn(m.total - base.current[m.viewerId])} sejak dibuka{changed.has(m.viewerId) ? " ●" : ""}</div>
                        )}
                      </td>
                      <td className="gain">{sgn(m.monthGain)}</td>
                      <td>{sgn(m.lastDayGain)}</td>
                      <td>{fmt(m.avgPerDay)}</td>
                      <td title={m.updated ?? ""}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: fresh(ts(m.updated), now), marginRight: 6 }} />
                        {ago(ts(m.updated), now)}
                        <div className="msub">data hari H{m.lastDay >= 0 ? m.lastDay : "-"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="empty">Gain dihitung dari selisih total fans kumulatif (<code>daily_fans</code>). &ldquo;Gain terakhir&rdquo; adalah hari terbaru yang tercatat, bisa masih berjalan (live). &ldquo;Update member&rdquo; = <code>last_updated</code> per baris member (hijau &lt;15 mnt, kuning &lt;2 jam). Frekuensi refresh backend tidak didokumentasikan; auto-refresh hanya mengambil ulang data yang ada.</p>
          </section>
          <details style={{ marginTop: 12 }}><summary>Response mentah</summary><pre>{JSON.stringify(raw, null, 2)}</pre></details>
        </>
      )}
    </main>
  );
}