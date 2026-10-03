"use client";
import { useState } from "react";
import { skillIconUrl } from "@/lib/skills";

// Ikon kecil; kalau gagal dimuat atau tidak ada, hilang saja (nama tetap tampil).
export default function SkillIcon({ icon, size = 18 }: { icon: string | null | undefined; size?: number }) {
  const [bad, setBad] = useState(false);
  if (!icon || bad) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={skillIconUrl(icon)} alt="" width={size} height={size} className="sico" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}
