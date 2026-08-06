import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ReceiptText, ShieldCheck } from "lucide-react";
import { ManualPaymentReviewForm } from "@/components/ManualPaymentReviewForm";
import { isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Verifikasi Pembayaran" };

function formatDate(value: string | null) {
  if (!value) return "Belum ada";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default async function AdminPaymentsPage() {
  const claims = await requireUser("/admin/payments");
  if (!(await isUserAdmin(String(claims.sub)))) notFound();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("order_id, user_id, plan, amount, status, manual_review_status, proof_path, proof_original_name, proof_submitted_at, created_at, profiles!payments_user_id_fkey(email)")
    .eq("provider", "manual_bank")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`ADMIN_PAYMENTS_READ_FAILED:${error.code}`);

  const payments = await Promise.all((data ?? []).map(async (payment) => {
    let proofUrl: string | null = null;
    if (payment.proof_path) {
      const { data: signed } = await admin.storage.from("payment-proofs").createSignedUrl(payment.proof_path, 600);
      proofUrl = signed?.signedUrl ?? null;
    }
    const profile = Array.isArray(payment.profiles) ? payment.profiles[0] : payment.profiles;
    return { ...payment, proofUrl, email: profile?.email || "Email tidak tersedia" };
  }));

  const pending = payments.filter((payment) => payment.manual_review_status === "pending_review");

  return <main className="app-page grid-bg admin-page manual-admin-page">
    <Link className="text-link back-link" href="/admin"><ArrowLeft size={15} /> Dashboard admin</Link>
    <div className="page-intro admin-intro"><div><span className="eyebrow">PAYMENT REVIEW // RESTRICTED</span><h1>Verifikasi pembayaran</h1><p>Periksa bukti transfer dengan mutasi rekening sebelum mengaktifkan paket pengguna.</p></div><span className="admin-verified"><ShieldCheck size={16} /> ADMIN TERVERIFIKASI</span></div>

    <section className="neon-card manual-payment-queue">
      <div className="admin-section-title"><div><span className="eyebrow">PENDING REVIEW</span><h2>{pending.length} pembayaran menunggu</h2></div><ReceiptText size={27} /></div>
      {pending.length === 0
        ? <div className="empty-state">Belum ada bukti transfer yang menunggu pemeriksaan.</div>
        : <div className="manual-admin-list">{pending.map((payment) => <article key={payment.order_id}>
          <div className="manual-payment-meta">
            <strong>{payment.email}</strong>
            <span>{PAYMENT_PLANS[payment.plan as keyof typeof PAYMENT_PLANS].name}</span>
            <b>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(payment.amount))}</b>
            <small>{payment.order_id} · Dikirim {formatDate(payment.proof_submitted_at)} WIB</small>
            {payment.proofUrl
              ? <a className="text-link" href={payment.proofUrl} target="_blank" rel="noreferrer">Buka bukti {payment.proof_original_name ? `(${payment.proof_original_name})` : ""} <ExternalLink size={14} /></a>
              : <span className="action-error">File bukti tidak tersedia.</span>}
          </div>
          <ManualPaymentReviewForm orderId={payment.order_id} />
        </article>)}</div>}
    </section>

    <section className="neon-card payment-history manual-admin-history">
      <div className="admin-section-title"><div><span className="eyebrow">RECENT ORDERS</span><h2>Riwayat transfer manual</h2></div></div>
      <div className="payment-list">{payments.slice(0, 20).map((payment) => <article key={payment.order_id}>
        <div><strong>{payment.email}</strong><small>{payment.order_id} · {formatDate(payment.created_at)} WIB</small></div>
        <b>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(payment.amount))}</b>
        <span className={`payment-status ${payment.status}`}>{String(payment.manual_review_status || payment.status).replaceAll("_", " ").toUpperCase()}</span>
      </article>)}</div>
    </section>
  </main>;
}
