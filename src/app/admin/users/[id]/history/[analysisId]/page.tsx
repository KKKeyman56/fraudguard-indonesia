import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { getAdminUserDetail, isUserAdmin } from "@/lib/admin-repository";
import { getAnalysisById } from "@/lib/analysis-repository";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Laporan Analisis Pengguna" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminUserAnalysisReportPage({
  params,
}: {
  params: Promise<{ id: string; analysisId: string }>;
}) {
  const { id, analysisId } = await params;
  const nextPath = `/admin/users/${id}/history/${analysisId}`;
  const claims = await requireUser(nextPath);

  if (!(await isUserAdmin(String(claims.sub)))) notFound();
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(analysisId)) notFound();

  const [detail, analysis] = await Promise.all([
    getAdminUserDetail(id),
    getAnalysisById(id, analysisId),
  ]);

  if (!detail || !analysis) notFound();

  return (
    <main className="app-page grid-bg admin-page">
      <Link className="text-link back-link" href={`/admin/users/${id}/history`}><ArrowLeft size={16} /> Kembali ke riwayat pengguna</Link>
      <div className="page-intro">
        <span className="eyebrow">ADMIN // USER ANALYSIS REPORT</span>
        <h1>Laporan {detail.user.email}</h1>
        <p>Detail transaksi dan penjelasan AI dari analisis yang tersimpan. Keputusan final tetap memerlukan verifikasi manusia.</p>
      </div>
      <ResultsPanel analysis={analysis} showReportLink={false} />
    </main>
  );
}
