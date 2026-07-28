import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, History, ShieldCheck } from "lucide-react";
import { getAdminUserDetail, isUserAdmin } from "@/lib/admin-repository";
import { listAnalysisHistory } from "@/lib/analysis-repository";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Riwayat Analisis Pengguna" };

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

export default async function AdminUserHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const rawPage = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const nextPath = `/admin/users/${id}/history${requestedPage > 1 ? `?page=${requestedPage}` : ""}`;
  const claims = await requireUser(nextPath);

  if (!(await isUserAdmin(String(claims.sub)))) notFound();

  const [detail, history] = await Promise.all([
    getAdminUserDetail(id),
    listAnalysisHistory(id, requestedPage),
  ]);

  if (!detail) notFound();

  return (
    <main className="app-page grid-bg admin-page">
      <Link className="text-link back-link" href={`/admin/users/${id}`}><ArrowLeft size={16} /> Kembali ke detail pengguna</Link>
      <div className="page-intro history-intro">
        <div>
          <span className="eyebrow">ADMIN // USER ANALYSIS ARCHIVE</span>
          <h1>Riwayat {detail.user.email}</h1>
          <p>Seluruh pemeriksaan milik pengguna ini. Akses hanya tersedia untuk administrator terverifikasi.</p>
        </div>
      </div>

      {history.items.length === 0 ? (
        <section className="neon-card no-report"><History size={48} /><h2>Belum ada riwayat</h2><p>Pengguna ini belum pernah menyimpan hasil analisis.</p></section>
      ) : (
        <>
          <section className="history-summary" aria-label="Ringkasan riwayat pengguna">
            <article className="neon-card"><span>Total analisis</span><strong>{history.total}</strong></article>
            <article className="neon-card"><span>Halaman</span><strong>{history.page}<small> / {history.totalPages}</small></strong></article>
          </section>

          <section className="history-list" aria-label="Daftar riwayat analisis pengguna">
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
                  <Link className="button button-small button-ghost" href={`/admin/users/${id}/history/${item.id}`}>Buka laporan <ArrowRight size={15} /></Link>
                </article>
              );
            })}
          </section>

          {history.totalPages > 1 && (
            <nav className="history-pagination" aria-label="Navigasi halaman riwayat pengguna">
              {history.page > 1 ? <Link className="button button-small button-ghost" href={`/admin/users/${id}/history?page=${history.page - 1}`}><ArrowLeft size={15} /> Sebelumnya</Link> : <span />}
              <span>Halaman {history.page} dari {history.totalPages}</span>
              {history.page < history.totalPages ? <Link className="button button-small button-ghost" href={`/admin/users/${id}/history?page=${history.page + 1}`}>Berikutnya <ArrowRight size={15} /></Link> : <span />}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
