import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Crown, FileSearch, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAnalysisQuota } from "@/lib/billing-repository";
import { PLAN_DETAILS } from "@/lib/plans";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const claims = await requireUser("/dashboard");
  const email = typeof claims.email === "string" ? claims.email : "pengguna terverifikasi";
  const quota = await getAnalysisQuota();
  const plan = PLAN_DETAILS[quota.plan];
  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">COMMAND CENTER // AUTHENTICATED</span><h1>Dashboard FraudGuard</h1><p>Selamat datang, {email}. Pusat kontrol sederhana untuk memeriksa transaksi dan menindaklanjuti hasil analisis.</p></div><div className="dashboard-grid"><section className="neon-card dashboard-hero"><div><span className="live-dot">AI SERVICE</span><h2>Mulai pemeriksaan baru</h2><p>Analisis hingga 50 transaksi sekaligus dari CSV, Excel, atau input manual.</p><Link className="button" href="/analyze">Analisis sekarang <ArrowRight /></Link></div><ShieldCheck size={96} /></section><article className="neon-card dashboard-card"><Activity /><span>Status sistem</span><strong>Siap digunakan</strong><p>Akun dan endpoint AI sudah dilindungi oleh session Supabase.</p></article><article className="neon-card dashboard-card"><Crown /><span>Paket {plan.name}</span><strong>{quota.monthlyLimit === null ? "Tanpa batas" : `${quota.remaining} tersisa`}</strong><p>{quota.monthlyLimit === null ? "Tidak ada batas sesi analisis bulanan." : `${quota.used} dari ${quota.monthlyLimit} sesi terpakai bulan ini.`}</p><Link className="text-link" href="/billing">Kelola paket <ArrowRight /></Link></article><article className="neon-card dashboard-card"><FileSearch /><span>Riwayat analisis</span><strong>Tersimpan aman</strong><p>Hasil tersimpan di akun dan dapat dibuka kembali.</p><Link className="text-link" href="/history">Lihat riwayat <ArrowRight /></Link></article></div></main>;
}
