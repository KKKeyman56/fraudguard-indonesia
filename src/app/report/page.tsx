import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportContent } from "@/components/ReportContent";
import { requireUser } from "@/lib/auth";
import { getAnalysisById, getLatestAnalysis } from "@/lib/analysis-repository";
import type { BatchAnalysis } from "@/types/transaction";

export const metadata: Metadata = { title: "Laporan Analisis" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const params = await searchParams;
  const requestedId = typeof params.id === "string" ? params.id : undefined;
  const nextPath = requestedId ? `/report?id=${encodeURIComponent(requestedId)}` : "/report";
  const claims = await requireUser(nextPath);
  const userId = String(claims.sub);
  let initialAnalysis: BatchAnalysis | null = null;
  let loadError = false;

  if (requestedId && !UUID_PATTERN.test(requestedId)) notFound();

  try {
    initialAnalysis = requestedId
      ? await getAnalysisById(userId, requestedId)
      : await getLatestAnalysis(userId);
  } catch (error) {
    loadError = true;
    console.error("FraudGuard report load error", error);
  }

  if (requestedId && !loadError && !initialAnalysis) notFound();

  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">REPORT CENTER</span><h1>Laporan analisis</h1><p>{requestedId ? "Preview hasil analisis pilihan dan unduh PDF untuk dokumentasi internal." : "Preview hasil terakhir dan unduh laporan PDF untuk dokumentasi internal."}</p></div><ReportContent initialAnalysis={initialAnalysis} loadError={loadError} /></main>;
}
