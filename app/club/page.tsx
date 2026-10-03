"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Img from "@/components/Img";
import { RANK_NAMES, rankIcon } from "@/lib/ranks";
import { parseClub, type Club } from "@/lib/club";

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "-" : n.toLocaleString("id-ID"));
const sgn = (n: number | null) => (n === null ? "-" : (n > 0 ? "+" : "") + n.toLocaleString("id-ID"));
type SortKey = "monthGain" | "lastDayGain" | "avgPerDay" | "total";

export default function ClubPage() {
  const [idInput, setIdInput] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [club, setClub] = useState<Club | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("monthGain");

  const load = useCallback(async (circleId: string) => {
    if (!/^\d+$/.test(circleId)) { setErr("Circle ID harus berupa angka"); return; }
    setLoading(true); setErr(""); setClub(null);
    try {
      const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "circle", values: { circle_id: circleId, year, month } }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else if (!d.ok) setErr(`HTTP ${d.status}: ${typeof d.body === "string" ? d.body : JSON.stringify(d.body)}`);
      else { setRaw(d.body); const c = parseClub(d.body); c ? setClub(c) : setErr("Response tidak dikenali"); }
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }, [year, month]);

  // buka otomatis kalau datang dari tab Circle rank (?id=...)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { setIdInput(id); load(id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const members = useMemo(() => (club ? [...club.members].sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity)) : []), [club, sort]);
  const sumGain = club?.members.reduce((s, m) => s + (m.monthGain ?? 0), 0) ?? 0;

  return (
    <main>
      <h1>Detail club</h1>
      <Nav />
      <section className="card">
        <div className="cfilters clubform">
          <div>
            <label htmlFor="cid">Circle ID</label>
            <input id="cid" inputMode="numeric" value={idInput} placeholder="mis. 574559219" onChange={(e) => setIdInput(e.target.value.trim())}
              onKeyDown={(e) => e.key === "Enter" && load(idInput)} />
          </div>
          <div><label htmlFor="cy">Tahun (opsional)</label><input id="cy" inputMode="numeric" value={year} placeholder="2026" onChange={(e) => setYear(e.target.value.trim())} /></div>
          <div><label htmlFor="cm">Bulan 1-12 (opsional)</label><input id="cm" inputMode="numeric" value={month} placeholder="10" onChange={(e) => setMonth(e.target.value.trim())} /></div>
          <button className="ghost" onClick={() => load(idInput)} disabled={loading}>{loading ? "Memuat…" : "Lihat"}</button>
        </div>
        {err && <p style={{ color: "var(--bad)" }}>Gagal memuat: {err}</p>}
      </section>

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
                {([["monthGain", "Gain bulan ini"], ["lastDayGain", "Gain terakhir"], ["avgPerDay", "Rata-rata/hari"], ["total", "Total fans"]] as [SortKey, string][]).map(([k, l]) => (
                  <button key={k} className={sort === k ? "ghost on" : "ghost"} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="mtable">
                <thead><tr><th>#</th><th>Member</th><th>Total fans</th><th>Gain bulan ini</th><th>Gain terakhir</th><th>Rata-rata/hari</th></tr></thead>
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
                      <td>{fmt(m.total)}</td>
                      <td className="gain">{sgn(m.monthGain)}</td>
                      <td>{sgn(m.lastDayGain)}</td>
                      <td>{fmt(m.avgPerDay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="empty">Gain dihitung dari selisih total fans kumulatif (<code>daily_fans</code>). &ldquo;Gain terakhir&rdquo; adalah hari terbaru yang tercatat, bisa masih berjalan (live).</p>
          </section>
          <details style={{ marginTop: 12 }}><summary>Response mentah</summary><pre>{JSON.stringify(raw, null, 2)}</pre></details>
        </>
      )}
    </main>
  );
}
