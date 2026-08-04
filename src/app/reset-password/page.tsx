import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PasswordRecoveryForm } from "@/components/PasswordRecoveryForm";
import { getVerifiedClaims } from "@/lib/auth";

export const metadata: Metadata = { title: "Buat Kata Sandi Baru" };

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryActive = cookieStore.get("fraudguard_password_recovery")?.value === "active";
  const claims = await getVerifiedClaims();
  if (!claims || !recoveryActive) redirect("/login?auth_error=recovery_link_invalid");

  return (
    <main className="auth-page grid-bg">
      <section className="auth-copy">
        <span className="eyebrow">PASSWORD RESET // VERIFIED</span>
        <ShieldCheck size={58} aria-hidden="true" />
        <h1>Buat kata sandi baru.</h1>
        <p>Tautan pemulihan berhasil diverifikasi. Gunakan kata sandi unik yang tidak dipakai di layanan lain.</p>
        <ul><li>Minimal 8 karakter</li><li>Gunakan kombinasi huruf, angka, dan simbol</li><li>Anda akan diminta masuk kembali setelah selesai</li></ul>
      </section>
      <section className="neon-card auth-card">
        <span className="eyebrow">SECURE PASSWORD UPDATE</span>
        <h2>Atur kata sandi</h2>
        <p>Masukkan dan konfirmasi kata sandi baru untuk akun FraudGuard.</p>
        <PasswordRecoveryForm mode="update" />
      </section>
    </main>
  );
}
