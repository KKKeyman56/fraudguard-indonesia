"use client";

import Link from "next/link";
import { Bot, Download, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { downloadAnalysisPdf } from "@/lib/pdf";
import type { BatchAnalysis } from "@/types/transaction";
import { RiskGauge } from "@/components/RiskGauge";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function ResultsPanel({ analysis, onReset }: { analysis: BatchAnalysis; onReset?: () => void }) {
  return (
    <section className="results-stack" aria-live="polite">
      <div className="summary-grid">
        <article className="neon-card stat-card"><span>Total transaksi</span><strong>{analysis.summary.total}</strong></article>
        <article className="neon-card stat-card safe"><span>AMAN</span><strong>{analysis.summary.aman}</strong></article>
        <article className="neon-card stat-card warning"><span>WASPADA</span><strong>{analysis.summary.waspada}</strong></article>
        <article className="neon-card stat-card danger"><span>TERDETEKSI</span><strong>{analysis.summary.terdeteksi}</strong></article>
      </div>

      <div className="results-overview">
        <article className="neon-card gauge-card">
          <div><span className="eyebrow">RISK ENGINE</span><h2>Risiko keseluruhan</h2></div>
          <RiskGauge score={analysis.summary.overallRisk} />
        </article>
        <article className="neon-card insight-card">
          <div className="card-title"><Bot aria-hidden="true" /><div><span className="eyebrow">AI INSIGHT</span><h2>Ringkasan untuk pemilik usaha</h2></div></div>
          <p>{analysis.summary.aiInsight}</p>
          <small>Hasil AI adalah alat bantu skrining. Verifikasi manusia tetap diperlukan sebelum membatalkan atau memblokir transaksi.</small>
        </article>
      </div>

      <div className="neon-card table-card">
        <div className="section-heading compact"><div><span className="eyebrow">HASIL ANALISIS</span><h2>Detail transaksi</h2></div><span>{analysis.results.length} baris</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Pelanggan</th><th>Nominal</th><th>Metode & waktu</th><th>Skor</th><th>Status</th><th>Penjelasan AI</th></tr></thead>
            <tbody>
              {analysis.results.map((item) => (
                <tr key={item.transaction.id}>
                  <td><strong>{item.transaction.pelanggan}</strong><small>{item.transaction.kota || "Kota tidak diisi"}</small></td>
                  <td>{rupiah.format(item.transaction.nominal)}</td>
                  <td>{item.transaction.metode}<small>{item.transaction.waktu}</small></td>
                  <td><strong>{item.riskScore}</strong>/100</td>
                  <td><span className={`status ${item.label.toLowerCase()}`}>{item.label === "AMAN" ? <ShieldCheck size={14} /> : item.label === "WASPADA" ? <TriangleAlert size={14} /> : <ShieldAlert size={14} />}{item.label}</span></td>
                  <td><details><summary>Lihat alasan</summary><p><strong>Alasan:</strong> {item.reasoning}</p><p><strong>Saran:</strong> {item.recommendation}</p></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="result-actions">
        <button className="button" onClick={() => downloadAnalysisPdf(analysis)}><Download size={18} /> Unduh PDF</button>
        <Link className="button button-ghost" href="/report">Buka halaman laporan</Link>
        {onReset && <button className="button button-ghost" onClick={onReset}><RotateCcw size={18} /> Analisis baru</button>}
      </div>
    </section>
  );
}
