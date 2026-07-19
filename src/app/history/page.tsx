import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, FileSearch, History, ShieldCheck } from "lucide-react";
import { listAnalysisHistory } from "@/lib/analysis-repository";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Riwayat Analisis" };

function riskLabel(score: number) {
  if (score >= 70) return "TERDETEKSI";
  if (score >= 40) return "WASPADA";
  return "AMAN";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const claims = await requireUser("/history");
  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  let history;
  try {
    history = await listAnalysisHistory(String(claims.sub), requestedPage);
  } catch (error) {
    console.error("FraudGuard history load error", error);
    return (
      <main className="app-page grid-bg">
        <div className="page-intro"><span className="eyebrow">ANALYSIS ARCHIVE</span><h1>Riwayat analisis</h1></div>
        <section className="neon-card no-report"><AlertTriangle size={48} /><h2>Riwayat belum dapat dimuat</h2><p>Database sedang tidak dapat dihubungi. Coba muat ulang beberapa saat lagi.</p></section>
      </main>
    );
  }

  return (
    <main className="app-page grid-bg">
      <div className="page-intro history-intro">
        <div><span className="eyebrow">ANALYSIS ARCHIVE</span><h1>Riwayat analisis</h1><p>Semua pemeriksaan tersimpan di akun Anda dan dapat dibuka kembali kapan saja.</p></div>
        <Link className="button" href="/analyze"><FileSearch size={18} /> Analisis baru</Link>
      </div>

      {history.items.length === 0 ? (
        <section className="neon-card no-report"><History size={48} /><h2>Belum ada riwayat</h2><p>Hasil analisis pertama Anda akan muncul di sini setelah pemeriksaan selesai.</p><Link className="button" href="/analyze">Mulai analisis <ArrowRight size={18} /></Link></section>
      ) : (
        <>
          <section className="history-summary" aria-label="Ringkasan riwayat">
            <article className="neon-card"><span>Total analisis</span><strong>{history.total}</strong></article>
            <article className="neon-card"><span>Halaman</span><strong>{history.page}<small> / {history.totalPages}</small></strong></article>
          </section>

          <section className="history-list" aria-label="Daftar riwayat analisis">
            {history.items.map((item) => {
              const label = riskLabel(item.overallRisk);
              return (
                <article className="neon-card history-card" key={item.id}>
                  <div className="history-score" data-risk={label.toLowerCase()}><strong>{item.overallRisk}</strong><span>RISIKO / 100</span></div>
                  <div className="history-detail">
                    <div className="history-meta"><time dateTime={item.createdAt}>{formatDate(item.createdAt)} WIB</time><span>{item.source === "manual" ? "Input manual" : "Upload file"}</span><span>{item.total} transaksi</span><span>{item.aiModel}</span></div>
                    <div className={`status ${label.toLowerCase()}`}><ShieldCheck size={13} /> {label}</div>
                    <p>{item.aiSummary}</p>
                    <div className="history-counts"><span className="safe">{item.aman} aman</span><span className="warning">{item.waspada} waspada</span><span className="danger">{item.terdeteksi} terdeteksi</span></div>
                  </div>
                  <Link className="button button-small button-ghost" href={`/report?id=${item.id}`}>Buka laporan <ArrowRight size={15} /></Link>
                </article>
              );
            })}
          </section>

          {history.totalPages > 1 && (
            <nav className="history-pagination" aria-label="Navigasi halaman riwayat">
              {history.page > 1 ? <Link className="button button-small button-ghost" href={`/history?page=${history.page - 1}`}><ArrowLeft size={15} /> Sebelumnya</Link> : <span />}
              <span>Halaman {history.page} dari {history.totalPages}</span>
              {history.page < history.totalPages ? <Link className="button button-small button-ghost" href={`/history?page=${history.page + 1}`}>Berikutnya <ArrowRight size={15} /></Link> : <span />}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
