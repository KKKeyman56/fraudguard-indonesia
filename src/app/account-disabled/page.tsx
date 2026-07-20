import type { Metadata } from "next";
import { Ban, LogOut, Mail } from "lucide-react";
import { getVerifiedClaims } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun Dinonaktifkan" };

export default async function AccountDisabledPage() {
  const claims = await getVerifiedClaims();
  const email = typeof claims?.email === "string" ? claims.email : "akun Anda";

  return <main className="auth-page grid-bg disabled-account-page">
    <section className="neon-card disabled-account-card">
      <Ban size={48} aria-hidden="true" />
      <span className="eyebrow">ACCOUNT ACCESS // SUSPENDED</span>
      <h1>Akun sedang dinonaktifkan</h1>
      <p>Akses untuk <strong>{email}</strong> dihentikan sementara oleh administrator. Data dan riwayat analisis tetap tersimpan.</p>
      <div className="disabled-contact"><Mail size={17} /> Hubungi administrator FraudGuard untuk meminta peninjauan akun.</div>
      <div className="disabled-account-actions">
        <form action="/auth/signout" method="post"><button className="button" type="submit"><LogOut size={17} /> Keluar</button></form>
      </div>
    </section>
  </main>;
}
