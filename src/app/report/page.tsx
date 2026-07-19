import type { Metadata } from "next";
import { ReportContent } from "@/components/ReportContent";
import { requireUser } from "@/lib/auth";
import { getLatestAnalysis } from "@/lib/analysis-repository";
import type { BatchAnalysis } from "@/types/transaction";

export const metadata: Metadata = { title: "Laporan Analisis" };

export default async function ReportPage() {
  const claims = await requireUser("/report");
  const userId = String(claims.sub);
  let initialAnalysis: BatchAnalysis | null = null;
  let loadError = false;

  try {
    initialAnalysis = await getLatestAnalysis(userId);
  } catch (error) {
    loadError = true;
    console.error("FraudGuard report load error", error);
  }

  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">REPORT CENTER</span><h1>Laporan analisis</h1><p>Preview hasil terakhir dan unduh laporan PDF untuk dokumentasi internal.</p></div><ReportContent initialAnalysis={initialAnalysis} loadError={loadError} /></main>;
}
