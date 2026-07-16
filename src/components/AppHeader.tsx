"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyze", label: "Analisis" },
  { href: "/report", label: "Laporan" },
];

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand glitch" href="/" data-text="FraudGuard" aria-label="FraudGuard beranda">
          <ShieldCheck size={24} aria-hidden="true" /> FraudGuard
        </Link>
        <button className="mobile-menu" onClick={() => setOpen((value) => !value)} aria-label="Buka navigasi" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Navigasi utama">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={pathname === link.href ? "active" : ""}>
              {link.label}
            </Link>
          ))}
          <Link className="button button-small" href="/analyze" onClick={() => setOpen(false)}>Mulai Analisis</Link>
        </nav>
      </div>
    </header>
  );
}
