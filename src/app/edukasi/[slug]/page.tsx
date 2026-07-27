import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { educationArticles, getEducationArticle } from "@/lib/education-content";

const siteUrl = "https://fraudguard-indonesia.vercel.app";

export function generateStaticParams() {
  return educationArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getEducationArticle(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/edukasi/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: `/edukasi/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: ["FraudGuard Indonesia"],
    },
  };
}

export default async function EducationArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getEducationArticle(slug);
  if (!article) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "id-ID",
    mainEntityOfPage: `${siteUrl}/edukasi/${article.slug}`,
    author: { "@type": "Organization", name: "FraudGuard Indonesia", url: siteUrl },
    publisher: { "@type": "Organization", name: "FraudGuard Indonesia", url: siteUrl },
    about: ["Fraud transaksi", "UMKM Indonesia", article.category],
  };

  return (
    <main className="article-page grid-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }} />
      <article className="article-shell">
        <Link className="text-link article-back" href="/edukasi"><ArrowLeft size={16} /> Semua panduan</Link>
        <header className="article-header">
          <span className="eyebrow">{article.category.toUpperCase()}</span>
          <h1>{article.title}</h1>
          <p>{article.description}</p>
          <div className="article-meta"><span><Clock3 size={15} /> {article.readingTime}</span><span>Diperbarui 27 Juli 2026</span></div>
        </header>
        <div className="article-content">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
          <aside className="article-safety neon-card">
            <ShieldCheck />
            <div><strong>Keputusan final tetap di tangan Anda</strong><p>FraudGuard memberikan rekomendasi penyaringan awal. Verifikasi data dan bukti transaksi sebelum menahan, membatalkan, atau memblokir transaksi.</p></div>
          </aside>
        </div>
        <footer className="article-footer">
          <div><span className="eyebrow">COBA DENGAN DATA ANDA</span><h2>Ubah panduan menjadi proses yang konsisten.</h2></div>
          <Link className="button" href="/analyze">Mulai analisis <ArrowRight size={17} /></Link>
        </footer>
      </article>
    </main>
  );
}
