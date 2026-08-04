import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Check, Crown, Gauge, ReceiptText, ShieldCheck } from "lucide-react";
import { getAnalysisQuota, getRecentPayments, type PaymentSummary } from "@/lib/billing-repository";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider, isPaymentProduction } from "@/lib/payment-provider";
import { PLAN_DETAILS, type SubscriptionPlan } from "@/lib/plans";
import { PaymentReturnStatus } from "@/components/PaymentReturnStatus";
import { PurchasePlanButton } from "@/components/PurchasePlanButton";

export const metadata: Metadata = { title: "Paket & Kuota" };

const features: Record<SubscriptionPlan, string[]> = {
  free: ["50 transaksi dianalisis per bulan", "Maksimal 50 transaksi sekali analisis", "Riwayat dan laporan PDF"],
  pro: ["5.000 transaksi dianalisis per bulan", "Insight AI lengkap", "Prioritas pengembangan fitur UMKM"],
  enterprise: ["10.000 transaksi dianalisis per bulan", "Integrasi dan volume khusus", "Dukungan prioritas"],
};

const paymentLabels: Record<PaymentSummary["status"], string> = {
  created: "DIBUAT",
  pending: "MENUNGGU BAYAR",
  paid: "BERHASIL",
  denied: "DITOLAK",
  cancelled: "DIBATALKAN",
  expired: "KEDALUWARSA",
  failed: "GAGAL",
  refunded: "DIKEMBALIKAN",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; orderId?: string }>;
}) {
  await requireUser("/billing");
  const [quota, payments, query] = await Promise.all([
    getAnalysisQuota(),
    getRecentPayments(),
    searchParams,
  ]);
  const paymentProvider = getPaymentProvider();
  const productionPayments = isPaymentProduction();
  const percentage = quota.monthlyLimit === null ? 0 : Math.min((quota.used / quota.monthlyLimit) * 100, 100);

  return <main className="app-page grid-bg billing-page">
    <div className="page-intro billing-intro"><div><span className="eyebrow">SUBSCRIPTION CONTROL</span><h1>Paket & kuota</h1><p>Pantau pemakaian bulanan dan pilih kapasitas yang sesuai dengan pertumbuhan bisnis Anda.</p></div><span className="current-plan"><Crown size={16} /> PAKET {PLAN_DETAILS[quota.plan].name.toUpperCase()}</span></div>

    {query.payment === "return" && query.orderId && <PaymentReturnStatus orderId={query.orderId} />}

    <section className="neon-card usage-card">
      <div><span className="eyebrow">PEMAKAIAN BULAN INI</span><h2>{quota.monthlyLimit === null ? "Transaksi tanpa batas" : `${quota.used.toLocaleString("id-ID")} dari ${quota.monthlyLimit.toLocaleString("id-ID")} transaksi`}</h2><p>{quota.monthlyLimit === null ? "Akun Anda tidak memiliki batas transaksi bulanan." : `${quota.remaining?.toLocaleString("id-ID")} transaksi masih dapat dianalisis sampai pergantian bulan.`}</p></div>
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
          {active
            ? <button className="button button-ghost" disabled>Paket saat ini</button>
            : plan === "free"
              ? <button className="button button-ghost" disabled>Paket dasar</button>
              : <PurchasePlanButton plan={plan} />}
        </article>;
      })}
    </section>

    <section className="neon-card payment-history">
      <div className="section-heading compact"><div><span className="eyebrow">{paymentProvider.toUpperCase()} {productionPayments ? "PRODUCTION" : "SANDBOX"}</span><h2>Riwayat pembayaran</h2></div><ReceiptText size={25} /></div>
      {payments.length === 0
        ? <p className="payment-empty">Belum ada transaksi pembayaran di akun ini.</p>
        : <div className="payment-list">{payments.map((payment) => <article key={payment.orderId}>
          <div><strong>{PLAN_DETAILS[payment.plan].name}</strong><small>{payment.orderId} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(payment.createdAt))} WIB</small></div>
          <b>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(payment.amount)}</b>
          <span className={`payment-status ${payment.status}`}>{paymentLabels[payment.status]}</span>
        </article>)}</div>}
    </section>
    <p className="billing-note">{productionPayments
      ? `Pembayaran satu kali berlaku 30 hari dan tidak diperpanjang otomatis. Paket aktif hanya setelah pembayaran diverifikasi oleh server ${paymentProvider === "doku" ? "DOKU" : "Midtrans"}.`
      : "Mode Sandbox aktif: tidak ada uang sungguhan yang ditagihkan. Paket aktif hanya setelah status pembayaran terverifikasi oleh server."}</p>
    <Link className="text-link billing-back" href="/dashboard">Kembali ke dashboard</Link>
  </main>;
}
