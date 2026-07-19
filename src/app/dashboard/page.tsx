import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Bot, FileSearch, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const claims = await requireUser("/dashboard");
  const email = typeof claims.email === "string" ? claims.email : "pengguna terverifikasi";
  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">COMMAND CENTER // AUTHENTICATED</span><h1>Dashboard FraudGuard</h1><p>Selamat datang, {email}. Pusat kontrol sederhana untuk memeriksa transaksi dan menindaklanjuti hasil analisis.</p></div><div className="dashboard-grid"><section className="neon-card dashboard-hero"><div><span className="live-dot">AI SERVICE</span><h2>Mulai pemeriksaan baru</h2><p>Analisis hingga 50 transaksi sekaligus dari CSV, Excel, atau input manual.</p><Link className="button" href="/analyze">Analisis sekarang <ArrowRight /></Link></div><ShieldCheck size={96} /></section><article className="neon-card dashboard-card"><Activity /><span>Status sistem</span><strong>Siap digunakan</strong><p>Akun dan endpoint AI sudah dilindungi oleh session Supabase.</p></article><article className="neon-card dashboard-card"><Bot /><span>Mesin insight</span><strong>Structured AI</strong><p>Output divalidasi sebelum ditampilkan kepada pengguna.</p></article><article className="neon-card dashboard-card"><FileSearch /><span>Laporan terakhir</span><strong>Tersimpan lokal</strong><p>Hasil terakhir tersedia pada perangkat ini.</p><Link className="text-link" href="/report">Lihat laporan <ArrowRight /></Link></article></div></main>;
}
