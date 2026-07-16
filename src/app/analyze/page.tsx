import type { Metadata } from "next";
import { AnalyzeWorkspace } from "@/components/AnalyzeWorkspace";

export const metadata: Metadata = { title: "Analisis Transaksi" };

export default function AnalyzePage() {
  return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">AI TRANSACTION SCANNER</span><h1>Analisis transaksi</h1><p>Upload CSV/Excel atau masukkan transaksi manual. Data dikirim langsung ke AI saat Anda menekan tombol analisis.</p></div><AnalyzeWorkspace /></main>;
}
