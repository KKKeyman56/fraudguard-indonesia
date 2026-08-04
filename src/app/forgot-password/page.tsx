import type { Metadata } from "next";
import { ShieldQuestion } from "lucide-react";
import { PasswordRecoveryForm } from "@/components/PasswordRecoveryForm";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page grid-bg">
      <section className="auth-copy">
        <span className="eyebrow">ACCOUNT RECOVERY // SECURE</span>
        <ShieldQuestion size={58} aria-hidden="true" />
        <h1>Pulihkan akses akun Anda.</h1>
        <p>Masukkan email yang digunakan saat mendaftar. Kami akan mengirim tautan sekali pakai untuk membuat kata sandi baru.</p>
        <ul><li>Tautan dikirim hanya ke email akun</li><li>Password lama tidak pernah ditampilkan</li><li>Tautan pemulihan memiliki masa berlaku terbatas</li></ul>
      </section>
      <section className="neon-card auth-card">
        <span className="eyebrow">FRAUDGUARD ACCOUNT</span>
        <h2>Lupa kata sandi?</h2>
        <p>Periksa kotak masuk dan folder spam setelah mengirim permintaan.</p>
        <PasswordRecoveryForm mode="request" />
      </section>
    </main>
  );
}
