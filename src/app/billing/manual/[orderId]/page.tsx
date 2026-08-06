import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CircleAlert, Clock3, ReceiptText } from "lucide-react";
import { ManualPaymentProofForm } from "@/components/ManualPaymentProofForm";
import { requireUser } from "@/lib/auth";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Transfer Bank" };

export default async function ManualPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireUser("/billing");
  const { orderId } = await params;
  const supabase = await createClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("order_id, plan, amount, status, provider, manual_review_status, proof_submitted_at, checkout_expires_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error || !payment || payment.provider !== "manual_bank") notFound();

  const bankName = process.env.MANUAL_PAYMENT_BANK_NAME?.trim();
  const accountNumber = process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER?.trim();
  const accountHolder = process.env.MANUAL_PAYMENT_ACCOUNT_HOLDER?.trim();
  if (!bankName || !accountNumber || !accountHolder) throw new Error("MANUAL_BANK_CONFIG_MISSING");

  const reviewStatus = payment.manual_review_status as string | null;
  // Server-rendered request time is required to prevent uploads to expired checkout links.
  // eslint-disable-next-line react-hooks/purity
  const hasNotExpired = Boolean(payment.checkout_expires_at && new Date(payment.checkout_expires_at).getTime() > Date.now());
  const canUpload = hasNotExpired && ["awaiting_proof", "pending_review"].includes(reviewStatus ?? "") && payment.status === "pending";
  const amount = Number(payment.amount);
  const plan = payment.plan as keyof typeof PAYMENT_PLANS;

  return <main className="app-page grid-bg manual-payment-page">
    <div className="page-intro"><span className="eyebrow">TRANSFER BANK MANUAL</span><h1>Selesaikan pembayaran</h1><p>Transfer sesuai nominal, lalu unggah bukti. Paket hanya aktif setelah verifikasi admin.</p></div>
    <section className="manual-payment-grid">
      <article className="neon-card manual-bank-card">
        <div className="admin-section-title"><div><span className="eyebrow">REKENING TUJUAN</span><h2>{bankName}</h2></div><Building2 size={27} /></div>
        <dl className="manual-bank-details">
          <div><dt>Nomor rekening</dt><dd className="manual-bank-nowrap">{accountNumber}</dd></div>
          <div><dt>Nominal transfer</dt><dd className="manual-bank-nowrap">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}</dd></div>
          <div className="manual-bank-wide"><dt>Atas nama</dt><dd>{accountHolder}</dd></div>
          <div className="manual-bank-wide"><dt>ID pesanan</dt><dd className="manual-bank-order-id">{payment.order_id}</dd></div>
        </dl>
        <p className="manual-payment-warning"><CircleAlert size={17} /> Pastikan rekening tujuan dan nominal benar sebelum mengirim uang.</p>
      </article>

      <article className="neon-card manual-proof-card">
        <div className="admin-section-title"><div><span className="eyebrow">BUKTI PEMBAYARAN</span><h2>{PAYMENT_PLANS[plan].name}</h2></div><ReceiptText size={27} /></div>
        {reviewStatus === "approved" || payment.status === "paid"
          ? <div className="manual-review-state success"><strong>Pembayaran disetujui</strong><span>Paket Anda sudah aktif.</span></div>
          : reviewStatus === "rejected"
            ? <div className="manual-review-state rejected"><strong>Bukti ditolak</strong><span>Hubungi admin FraudGuard bila Anda memerlukan bantuan.</span></div>
            : reviewStatus === "pending_review"
              ? <><div className="manual-review-state"><Clock3 size={18} /><strong>Menunggu pemeriksaan admin</strong><span>Anda boleh mengunggah ulang bila bukti sebelumnya kurang jelas.</span></div>{canUpload && <ManualPaymentProofForm orderId={payment.order_id} />}</>
              : canUpload
                ? <ManualPaymentProofForm orderId={payment.order_id} />
                : <div className="manual-review-state rejected"><strong>Pesanan tidak dapat diproses</strong><span>Buat pesanan pembayaran baru dari halaman paket.</span></div>}
      </article>
    </section>
    <p className="billing-note">Verifikasi dilakukan manual. Simpan bukti transfer sampai paket aktif.</p>
    <Link className="text-link billing-back" href="/billing">Kembali ke paket & kuota</Link>
  </main>;
}
