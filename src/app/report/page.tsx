"use client";

import Link from "next/link";
import { ArrowRight, FileQuestion } from "lucide-react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { useAnalysisStore } from "@/store/analysis-store";

export default function ReportPage() {
  const analysis = useAnalysisStore((state) => state.analysis);
  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">REPORT CENTER</span><h1>Laporan analisis</h1><p>Preview hasil terakhir dan unduh laporan PDF untuk dokumentasi internal.</p></div>{analysis ? <ResultsPanel analysis={analysis} /> : <section className="neon-card no-report"><FileQuestion size={48} /><h2>Belum ada laporan</h2><p>Jalankan analisis transaksi terlebih dahulu. Hasil terakhir akan tersimpan pada perangkat ini.</p><Link className="button" href="/analyze">Buat analisis <ArrowRight /></Link></section>}</main>;
}
