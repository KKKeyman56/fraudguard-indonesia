"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BatchAnalysis } from "@/types/transaction";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function downloadAnalysisPdf(analysis: BatchAnalysis) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, 210, 42, "F");
  doc.setTextColor(0, 255, 136);
  doc.setFontSize(22);
  doc.text("FraudGuard", 14, 18);
  doc.setTextColor(220, 230, 235);
  doc.setFontSize(10);
  doc.text("Laporan Analisis Risiko Transaksi Berbasis AI", 14, 27);
  doc.text(`Dibuat: ${new Date(analysis.meta?.analyzedAt || Date.now()).toLocaleString("id-ID")}`, 14, 34);

  doc.setTextColor(20, 25, 35);
  doc.setFontSize(12);
  doc.text(`Risiko keseluruhan: ${analysis.summary.overallRisk}/100`, 14, 51);
  doc.text(
    `Total ${analysis.summary.total} | Aman ${analysis.summary.aman} | Waspada ${analysis.summary.waspada} | Terdeteksi ${analysis.summary.terdeteksi}`,
    14,
    59,
  );

  autoTable(doc, {
    startY: 67,
    head: [["Pelanggan", "Nominal", "Metode", "Waktu", "Skor", "Status"]],
    body: analysis.results.map((item) => [
      item.transaction.pelanggan,
      rupiah.format(item.transaction.nominal),
      item.transaction.metode,
      item.transaction.waktu,
      String(item.riskScore),
      item.label,
    ]),
    styles: { fontSize: 8, cellPadding: 2.4 },
    headStyles: { fillColor: [18, 27, 39], textColor: [0, 255, 136] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
  doc.setFontSize(12);
  doc.text("Insight AI", 14, finalY + 12);
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(analysis.summary.aiInsight, 182), 14, finalY + 19);
  doc.setFontSize(8);
  doc.setTextColor(90, 98, 110);
  doc.text("Catatan: hasil ini adalah alat bantu skrining, bukan bukti hukum. Lakukan verifikasi manusia sebelum mengambil tindakan.", 14, 285);
  doc.save(`FraudGuard-Laporan-${new Date().toISOString().slice(0, 10)}.pdf`);
}
