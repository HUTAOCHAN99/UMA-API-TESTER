"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Img from "@/components/Img";
import { RANK_NAMES, rankIcon } from "@/lib/ranks";
import { nameVariants } from "@/lib/names";
import { parseClub, detectLeft, windowGain, weeklyBuckets, type Club } from "@/lib/club";
import { parseCircles, findTotal, type CircleRow } from "@/lib/circles";
import { useLeaders, leaderText } from "@/lib/useLeaders";

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "-" : n.toLocaleString("id-ID"));
const sgn = (n: number | null) => (n === null ? "-" : (n > 0 ? "+" : "") + n.toLocaleString("id-ID"));
type SortKey = "monthGain" | "weekGain" | "lastDayGain" | "avgPerDay" | "total" | "updated";
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
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "left">("all");
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
    setSearching(true); setErr(""); setClub(null); setResults(null); setNote("");
    try {
      const fetchList = async (name: string) => {
        const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "circle-list", values: { page: "0", limit: "20", name } }) });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        if (!d.ok) throw new Error(`HTTP ${d.status}: ${typeof d.body === "string" ? d.body : JSON.stringify(d.body)}`);
        return { rows: parseCircles(d.body, 0, []), total: findTotal(d.body) };
      };
      // coba tulisan asli dulu; kalau kosong, coba varian kurung fullwidth/ASCII, terakhir tanpa kurung
      let used = q, res = await fetchList(q);
      if (res.rows.length === 0) {
        for (const v of nameVariants(q).slice(1)) {
          const r2 = await fetchList(v);
          if (r2.rows.length) { res = r2; used = v; break; }
        }
      }
      setResTotal(res.total);
      if (used !== q) setNote(`Tidak ada hasil untuk "${q}". Menampilkan hasil untuk "${used}".`);
      if (res.rows.length === 1) { setIdInput(res.rows[0].id); load(res.rows[0].id); }
      else if (res.rows.length === 0) setErr(`Tidak ada circle dengan nama "${q}"`);
      else setResults(res.rows);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
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

  const endDay = club ? Math.max(-1, ...club.members.map((m) => m.lastDay)) : -1; // hari kompetisi terbaru di club
  const wk = (m: Club["members"][number]) => windowGain(m.days, endDay, 7);
  const val = (m: Club["members"][number]) => (sort === "updated" ? ts(m.updated) : sort === "weekGain" ? wk(m) : m[sort]) ?? -Infinity;
  const leftMap = useMemo(() => (club ? detectLeft(club) : new Map()), [club]);
  const members = useMemo(() => (club ? club.members.filter((m) => status === "all" || (status === "left") === leftMap.has(m.viewerId)).sort((a, b) => val(b) - val(a)) : []), [club, sort, status, leftMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const leftCount = leftMap.size;
  const unexplained = club && club.memberCount !== null ? club.members.length - leftCount - club.memberCount : 0;
  const leaderOf = useLeaders(results ?? []);
  const maxGain = Math.max(1, ...(club?.members.map((m) => m.monthGain ?? 0) ?? [0]));
  const sumGain = club?.members.reduce((s, m) => s + (m.monthGain ?? 0), 0) ?? 0;
  const sumWeek = club ? club.members.reduce((s, m) => s + (windowGain(m.days, endDay, 7) ?? 0), 0) : 0;
  const clubWeeks = useMemo(() => {
    if (!club || endDay < 1) return [];
    const all = club.members.flatMap((m) => m.days); // gabungan gain harian semua member (hari sama dijumlah)
    const byDay = new Map<number, number>(); all.forEach((d) => byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.gain));
    return weeklyBuckets([...byDay].map(([day, gain]) => ({ day, gain })), endDay);
  }, [club, endDay]);

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

      {note && <p className="empty">{note}</p>}
      {results && (
        <section className="card" style={{ marginTop: 12 }}>
          <span className="teamtotal">{resTotal !== null && resTotal > results.length ? `${results.length} dari ${fmt(resTotal)} hasil (persempit nama untuk hasil lebih spesifik)` : `${results.length} hasil`}</span>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table className="mtable ctable">
              <thead><tr><th>Circle</th><th>Leader</th><th>Rank</th><th>Member</th><th>Live fans</th><th></th></tr></thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><div className="msub"><code>{c.id}</code></div></td>
                    <td className="leadercell"><b>{leaderText(leaderOf(c))}</b><div className="msub"><code>{leaderOf(c)?.id || ""}</code></div></td>
                    <td><span className="rankcell">{c.tier ? <Img src={rankIcon(c.tier)} alt={RANK_NAMES[c.tier - 1]} className="rankicon" /> : null}#{fmt(c.rank)}</span></td>
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
            <div className="stats kpis">
              <div className="stat"><span>Live fans</span><b>{fmt(club.livePoints)}</b></div>
              <div className="stat"><span>Monthly fans</span><b>{fmt(club.monthlyPoint)}</b></div>
              <div className="stat"><span>Rank live</span><b>{club.liveRank !== null ? `#${fmt(club.liveRank)}` : "-"}</b></div>
              <div className="stat"><span>Rank bulanan</span><b>{club.monthlyRank !== null ? `#${fmt(club.monthlyRank)}` : "-"}</b></div>
              <div className="stat"><span>Ke tier atas</span><b>{fmt(club.toNext)}</b></div>
              <div className="stat"><span>Buffer tier bawah</span><b>{fmt(club.toLower)}</b></div>
              <div className="stat"><span>Total gain member</span><b>{fmt(sumGain)}</b></div>
              <div className="stat"><span>Fans 7 hari terakhir</span><b>{sgn(sumWeek)}</b></div>
              <div className="stat"><span>Update terakhir</span><b>{club.lastUpdated ? new Date(club.lastUpdated).toLocaleString("id-ID") : "-"}</b></div>
            </div>
          </section>

          <section className="card" style={{ marginTop: 12 }}>
            <div className="teamhead sorthead">
              <span className="teamtotal">Member ({club.members.length - leftCount} aktif{leftCount > 0 ? ` · ${leftCount} keluar` : ""})</span>
              <div className="seg">
                {([["monthGain", "Gain bulan ini"], ["weekGain", "Gain 7 hari"], ["lastDayGain", "Gain terakhir"], ["avgPerDay", "Rata-rata/hari"], ["total", "Total fans"], ["updated", "Terbaru diupdate"]] as [SortKey, string][]).map(([k, l]) => (
                  <button key={k} className={sort === k ? "ghost on" : "ghost"} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
                ))}
              </div>
            </div>
            {/* {club.memberCount !== null && club.members.length !== club.memberCount && (
              <p className="empty" style={{ margin: "10px 0 0" }}>
                API: <b>member_count = {club.memberCount}</b>, tapi <code>members[]</code> berisi <b>{club.members.length}</b> baris, jadi {club.members.length - club.memberCount} baris bukan anggota saat ini (mantan member bulan ini).
                {leftCount > 0 ? ` Ditandai ${leftCount} (tanda "Diduga keluar" = tebakan dari data yang berhenti lebih awal / last_updated paling lama).` : ""}
                {unexplained > 0 ? ` ${unexplained} baris belum bisa dibedakan, buka "Gain harian" untuk melihat daily_fans mentahnya.` : ""}
              </p>
            )} */}
            <div className="seg statusseg">
              {([["all", `Semua (${club.members.length})`], ["active", `Aktif (${club.members.length - leftCount})`], ["left", `Keluar (${leftCount})`]] as ["all" | "active" | "left", string][]).map(([k, l]) => (
                <button key={k} className={status === k ? "ghost on" : "ghost"} aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>
              ))}
            </div>
            {clubWeeks.length > 0 && (
              <div className="daygains" style={{ marginTop: 10 }}>
                <span className="msub">Fans club per minggu:</span>{" "}
                {clubWeeks.map((w) => <span key={w.week} className="chip" title={`Hari kompetisi H${w.from}-H${w.to}`}>Minggu {w.week}{w.partial ? " (berjalan)" : ""}: <b>{sgn(w.gain)}</b></span>)}
              </div>
            )}
            <div className="tmeta autobar">
              <label htmlFor="auto" style={{ margin: 0 }}>Auto-refresh</label>
              <select id="auto" value={auto} onChange={(e) => setAuto(+e.target.value)}>
                <option value={0}>Mati</option><option value={30}>30 dtk</option><option value={60}>1 menit</option><option value={300}>5 menit</option>
              </select>
              <button className="ghost" onClick={() => load(activeId.current, true)}>Refresh sekarang</button>
              <span>Diambil <b>{ago(fetchedAt, now)}</b></span>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="mtable">
                <thead><tr><th>#</th><th>Member</th><th>Total fans</th><th>Gain bulan ini</th><th>Gain 7 hari</th><th>Gain terakhir</th><th>Rata-rata/hari</th><th>Update member</th></tr></thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={m.viewerId || i} style={leftMap.has(m.viewerId) ? { opacity: 0.6 } : undefined}>
                      <td>{i + 1}</td>
                      <td>
                        <b>{m.name}</b>{m.isLeader && <span className="mbadge" style={{ marginLeft: 6 }}>Leader</span>}
                        {leftMap.has(m.viewerId) && <span className="mbadge" style={{ marginLeft: 6, color: "var(--bad)" }} title={leftMap.get(m.viewerId)!.reason}>{leftMap.get(m.viewerId)!.kind === "marker" ? "Keluar" : "Diduga keluar"}</span>}
                        <div className="msub"><code>{m.viewerId}</code>{m.prevCircleName && ` · sebelumnya di ${m.prevCircleName}`}</div>
                        {(m.days.length > 0 || m.raw.length > 0) && (
                          <details><summary>Gain harian</summary>
                            <div className="msub" style={{ wordBreak: "break-all" }}>daily_fans mentah: <code>{JSON.stringify(m.raw)}</code></div>
                            <div className="daygains">{weeklyBuckets(m.days, m.lastDay).map((w) => <span key={"w" + w.week} className="chip" title={`H${w.from}-H${w.to}`}>Minggu {w.week}{w.partial ? " (berjalan)" : ""}: <b>{sgn(w.gain)}</b></span>)}</div>
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
                      <td className="gain"><span className="gbar" style={{ width: `${Math.max(0, (m.monthGain ?? 0) / maxGain * 100)}%` }} />{sgn(m.monthGain)}</td>
                      <td>{sgn(wk(m))}</td>
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
              {members.length === 0 && <p className="empty">Tidak ada member pada filter ini.</p>}
            </div>
           
          </section>
          <details style={{ marginTop: 12 }}><summary>Response mentah</summary><pre>{JSON.stringify(raw, null, 2)}</pre></details>
        </>
      )}
    </main>
  );
}