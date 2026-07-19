"use client";

import Link from "next/link";
import { ArrowRight, FileQuestion } from "lucide-react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { useAnalysisStore } from "@/store/analysis-store";
import type { BatchAnalysis } from "@/types/transaction";

export function ReportContent({ initialAnalysis, loadError }: { initialAnalysis: BatchAnalysis | null; loadError: boolean }) {
  const localAnalysis = useAnalysisStore((state) => state.analysis);
  const analysis = initialAnalysis || localAnalysis;

  if (analysis) return <ResultsPanel analysis={analysis} />;

  return <section className="neon-card no-report"><FileQuestion size={48} /><h2>{loadError ? "Laporan belum dapat dimuat" : "Belum ada laporan"}</h2><p>{loadError ? "Database sedang tidak dapat dihubungi. Coba muat ulang halaman beberapa saat lagi." : "Jalankan analisis transaksi terlebih dahulu. Hasil berikutnya akan tersimpan aman pada akun Anda."}</p><Link className="button" href="/analyze">Buat analisis <ArrowRight /></Link></section>;
}
