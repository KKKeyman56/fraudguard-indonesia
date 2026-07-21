import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Check, Crown, Gauge, ShieldCheck } from "lucide-react";
import { getAnalysisQuota } from "@/lib/billing-repository";
import { requireUser } from "@/lib/auth";
import { PLAN_DETAILS, type SubscriptionPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Paket & Kuota" };

const features: Record<SubscriptionPlan, string[]> = {
  free: ["50 sesi analisis per bulan", "Maksimal 50 transaksi per sesi", "Riwayat dan laporan PDF"],
  pro: ["5.000 sesi analisis per bulan", "Insight AI lengkap", "Prioritas pengembangan fitur UMKM"],
  enterprise: ["10.000 sesi analisis per bulan", "Integrasi dan volume khusus", "Dukungan prioritas"],
};

export default async function BillingPage() {
  await requireUser("/billing");
  const quota = await getAnalysisQuota();
  const percentage = quota.monthlyLimit === null ? 0 : Math.min((quota.used / quota.monthlyLimit) * 100, 100);

  return <main className="app-page grid-bg billing-page">
    <div className="page-intro billing-intro"><div><span className="eyebrow">SUBSCRIPTION CONTROL</span><h1>Paket & kuota</h1><p>Pantau pemakaian bulanan dan pilih kapasitas yang sesuai dengan pertumbuhan bisnis Anda.</p></div><span className="current-plan"><Crown size={16} /> PAKET {PLAN_DETAILS[quota.plan].name.toUpperCase()}</span></div>

    <section className="neon-card usage-card">
      <div><span className="eyebrow">PEMAKAIAN BULAN INI</span><h2>{quota.monthlyLimit === null ? "Analisis tanpa batas" : `${quota.used.toLocaleString("id-ID")} dari ${quota.monthlyLimit.toLocaleString("id-ID")} sesi`}</h2><p>{quota.monthlyLimit === null ? "Akun Anda tidak memiliki batas sesi bulanan." : `${quota.remaining?.toLocaleString("id-ID")} sesi masih tersedia sampai pergantian bulan.`}</p></div>
      <Gauge size={56} />
      {quota.monthlyLimit !== null && <div className="usage-progress"><i style={{ width: `${percentage}%` }} /></div>}
    </section>

    <section className="billing-plans" aria-label="Pilihan paket FraudGuard">
      {(Object.keys(PLAN_DETAILS) as SubscriptionPlan[]).map((plan) => {
        const detail = PLAN_DETAILS[plan];
        const active = quota.plan === plan;
        return <article className={`neon-card billing-plan${active ? " active" : ""}`} key={plan}>
          {active && <span className="plan-active"><ShieldCheck size={13} /> PAKET AKTIF</span>}
          <Bot size={26} />
          <h2>{detail.name}</h2><strong>{detail.price}</strong><p>{detail.description}</p>
          <ul>{features[plan].map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}</ul>
          {active ? <button className="button button-ghost" disabled>Paket saat ini</button> : plan === "enterprise" ? <a className="button" href="mailto:halo@fraudguard.id?subject=Permintaan%20Upgrade%20FraudGuard%20Max">Ajukan paket Max <ArrowRight size={16} /></a> : <a className="button" href="mailto:halo@fraudguard.id?subject=Permintaan%20Upgrade%20FraudGuard%20Pro">Ajukan upgrade <ArrowRight size={16} /></a>}
        </article>;
      })}
    </section>
    <p className="billing-note">Pembayaran otomatis sedang disiapkan. Untuk tahap awal, upgrade dikonfirmasi manual oleh admin dan tidak ada tagihan tanpa persetujuan Anda.</p>
    <Link className="text-link billing-back" href="/dashboard">Kembali ke dashboard</Link>
  </main>;
}
