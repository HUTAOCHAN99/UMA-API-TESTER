"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "API tester" },
  { href: "/trainer", label: "Cari trainer" },
  { href: "/lookup", label: "Lookup nama card" },
  { href: "/thresholds", label: "Rank thresholds" },
  { href: "/circles", label: "Circle rank" },
  { href: "/club", label: "Detail club" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Halaman">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? "tab on" : "tab"} aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
