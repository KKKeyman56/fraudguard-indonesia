import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseZap } from "lucide-react";

export const metadata: Metadata = {
  title: "Penghapusan Data",
  description: "Cara menghapus akun dan data FraudGuard.",
};

export default function DataDeletionPage() {
  return (
    <main className="app-page grid-bg legal-page">
      <header className="page-intro">
        <span className="eyebrow">DATA DELETION</span>
        <h1>Penghapusan akun &amp; data</h1>
        <p>Pengguna dapat menghapus akun secara mandiri tanpa menghubungi admin.</p>
      </header>
      <section className="neon-card deletion-guide">
        <DatabaseZap size={42} />
        <h2>Cara menghapus akun</h2>
        <ol>
          <li>Masuk ke akun FraudGuard.</li>
          <li>Buka <Link href="/settings">Pengaturan Akun</Link>.</li>
          <li>Ketik konfirmasi yang diminta lalu tekan “Hapus akun permanen”.</li>
        </ol>
        <p>Penghapusan mencakup profil, analisis, transaksi, review, audit terkait, dan data pembayaran yang memiliki relasi cascade. Proses tidak dapat dibatalkan.</p>
        <p>Catatan terbatas dapat dipertahankan bila diwajibkan hukum, diperlukan untuk keamanan, atau penyelesaian sengketa. Data tersebut dibatasi dan tidak dipakai untuk analisis produk.</p>
        <Link className="button" href="/settings">Buka Pengaturan Akun</Link>
      </section>
    </main>
  );
}

