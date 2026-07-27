import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { educationArticles } from "@/lib/education-content";

export const metadata: Metadata = {
  title: "Pusat Edukasi Fraud Transaksi untuk UMKM",
  description: "Panduan praktis bagi UMKM Indonesia untuk mengenali transaksi mencurigakan, bukti transfer palsu, chargeback, dan pola anomali.",
  alternates: { canonical: "/edukasi" },
  openGraph: {
    title: "Pusat Edukasi FraudGuard",
    description: "Panduan praktis pencegahan fraud transaksi untuk pemilik UMKM Indonesia.",
    url: "/edukasi",
  },
};

export default function EducationPage() {
  return (
    <main className="education-page grid-bg">
      <section className="education-hero">
        <span className="eyebrow">FRAUDGUARD KNOWLEDGE BASE</span>
        <h1>Pusat edukasi <em>fraud transaksi</em></h1>
        <p>Panduan praktis untuk membantu pemilik UMKM mengenali sinyal risiko, membangun proses verifikasi, dan menjaga keputusan tetap adil bagi pelanggan.</p>
        <div className="education-disclaimer"><ShieldCheck size={18} /> Materi edukasi dan hasil AI bukan vonis. Keputusan final tetap memerlukan verifikasi manusia.</div>
      </section>
      <section className="education-library" aria-label="Daftar panduan">
        {educationArticles.map((article) => (
          <article className="neon-card education-card" key={article.slug}>
            <BookOpen />
            <span>{article.readingTime} · {article.category}</span>
            <h2>{article.title}</h2>
            <p>{article.description}</p>
            <Link className="text-link" href={`/edukasi/${article.slug}`}>Baca panduan <ArrowRight size={16} /></Link>
          </article>
        ))}
      </section>
    </main>
  );
}
