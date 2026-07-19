import type { Metadata } from "next";
import { ReportContent } from "@/components/ReportContent";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Laporan Analisis" };

export default async function ReportPage() {
  await requireUser("/report");
  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">REPORT CENTER</span><h1>Laporan analisis</h1><p>Preview hasil terakhir dan unduh laporan PDF untuk dokumentasi internal.</p></div><ReportContent /></main>;
}
