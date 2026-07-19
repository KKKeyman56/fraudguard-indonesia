import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { getVerifiedClaims } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk atau Daftar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const claims = await getVerifiedClaims();
  if (claims) redirect("/dashboard");
  const { next = "/dashboard" } = await searchParams;

  return (
    <main className="auth-page grid-bg">
      <section className="auth-copy">
        <span className="eyebrow">SECURE ACCESS // UMKM</span>
        <ShieldCheck size={58} aria-hidden="true" />
        <h1>Jaga transaksi bisnis Anda.</h1>
        <p>Masuk untuk memakai AI Insight FraudGuard. Data analisis hanya diproses setelah Anda mengirimkannya.</p>
        <ul><li>Session aman dan otomatis diperbarui</li><li>Endpoint AI hanya untuk pengguna terdaftar</li><li>Email harus dikonfirmasi sebelum digunakan</li></ul>
      </section>
      <section className="neon-card auth-card">
        <span className="eyebrow">FRAUDGUARD ACCOUNT</span>
        <h2>Masuk atau buat akun</h2>
        <p>Satu akun untuk dashboard, analisis AI, dan laporan transaksi.</p>
        <AuthForm next={next} />
      </section>
    </main>
  );
}
