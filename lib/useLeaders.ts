"use client";
import { useEffect, useState } from "react";
import { parseClub } from "@/lib/club";
import type { CircleRow } from "@/lib/circles";

export type Leader = { id: string; name: string | null };
const cache = new Map<string, Leader>(); // circle_id -> leader (hasil dari endpoint detail)

// Leader dibaca dari list kalau ada; kalau tidak, diambil dari detail circle (4 request paralel, di-cache).
export function useLeaders(rows: CircleRow[]) {
  const [, tick] = useState(0);
  useEffect(() => {
    let dead = false;
    const todo = rows.filter((r) => r.id && !r.leaderId && !cache.has(r.id)).map((r) => r.id);
    let i = 0;
    const worker = async () => {
      while (!dead && i < todo.length) {
        const id = todo[i++];
        try {
          const r = await fetch("/api/uma", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "circle", values: { circle_id: id } }) });
          const d = await r.json();
          const c = d.ok ? parseClub(d.body) : null;
          cache.set(id, { id: c?.leaderId ?? "", name: c?.leaderName ?? null });
        } catch { cache.set(id, { id: "", name: null }); }
        if (!dead) tick((n) => n + 1);
      }
    };
    for (let k = 0; k < 4; k++) worker();
    return () => { dead = true; };
  }, [rows]);
  // undefined = masih memuat, null = tidak ada data leader
  return (r: CircleRow): Leader | null | undefined => {
    if (r.leaderId || r.leaderName) return { id: r.leaderId, name: r.leaderName };
    const c = cache.get(r.id);
    return c ? (c.id || c.name ? c : null) : undefined;
  };
}

export const leaderText = (l: Leader | null | undefined) => (l === undefined ? "memuat…" : l === null ? "-" : l.name ?? "-");
