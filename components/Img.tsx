"use client";
import { useState } from "react";

export default function Img({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return <div className={`${className} noimg`}>tidak ada gambar</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}
