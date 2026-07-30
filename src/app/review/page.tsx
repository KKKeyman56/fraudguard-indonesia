import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, ClipboardCheck, ShieldAlert } from "lucide-react";
import { ReviewControls } from "@/components/ReviewControls";
import { requireUser } from "@/lib/auth";
import { getReviewDashboardData } from "@/lib/review-repository";
import { riskLabelClass } from "@/types/transaction";

export const metadata: Metadata = { title: "Review Risiko" };

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00Z`));
}

export default async function ReviewPage() {
  const claims = await requireUser("/review");
  let data;
  try {
    data = await getReviewDashboardData(String(claims.sub));
  } catch (error) {
    console.error("FraudGuard review dashboard load failed", error);
    return <main className="app-page grid-bg"><div className="page-intro"><span className="eyebrow">REVIEW WORKFLOW</span><h1>Review risiko</h1></div><section className="neon-card no-report"><AlertTriangle size={48} /><h2>Dashboard belum dapat dimuat</h2><p>Database review sedang tidak tersedia. Coba muat ulang beberapa saat lagi.</p></section></main>;
  }
  const maxTrend = Math.max(1, ...data.trends.map((item) => item.averageRisk));

  return (
    <main className="app-page grid-bg review-page">
      <div className="page-intro review-intro">
        <div><span className="eyebrow">HUMAN REVIEW WORKFLOW</span><h1>Review risiko</h1><p>Konfirmasi hasil transaksi, ukur false positive, dan simpan jejak keputusan manusia.</p></div>
        <span className="admin-verified"><ClipboardCheck size={16} /> AUDIT AKTIF</span>
      </div>

      <section className="review-stat-grid" aria-label="Ringkasan review">
        <article className="neon-card"><Activity /><span>Perlu ditinjau</span><strong>{data.metrics.pending}</strong></article>
        <article className="neon-card"><CheckCircle2 /><span>Selesai</span><strong>{data.metrics.reviewed}</strong></article>
        <article className="neon-card"><ShieldAlert /><span>Bermasalah</span><strong>{data.metrics.problem}</strong></article>
        <article className="neon-card"><BarChart3 /><span>False positive</span><strong>{data.metrics.falsePositiveRate}%</strong><small>{data.metrics.falsePositives} transaksi berisiko ternyata aman</small></article>
      </section>

      <section className="review-overview-grid">
        <article className="neon-card baseline-card">
          <span className="eyebrow">BUSINESS BASELINE</span>
          <h2>Pola normal bisnis Anda</h2>
          <dl>
            <div><dt>Sampel</dt><dd>{data.baseline.sampleSize} transaksi</dd></div>
            <div><dt>Median nominal</dt><dd>{rupiah.format(data.baseline.medianAmount)}</dd></div>
            <div><dt>Jam normal</dt><dd>{data.baseline.normalHourStart === null ? "Butuh minimal 10 sampel" : `${String(data.baseline.normalHourStart).padStart(2, "0")}.00 - ${String(data.baseline.normalHourEnd).padStart(2, "0")}.59`}</dd></div>
            <div><dt>Metode dominan</dt><dd>{data.baseline.dominantMethods.join(", ") || "Belum cukup data"}</dd></div>
            <div><dt>Kota dominan</dt><dd>{data.baseline.dominantCities.join(", ") || "Belum cukup data"}</dd></div>
          </dl>
          <small>Signal baseline mulai memengaruhi skor setelah sampel minimum terpenuhi.</small>
        </article>

        <article className="neon-card trend-card">
          <span className="eyebrow">30-DAY RISK TREND</span>
          <h2>Tren risiko analisis</h2>
          {data.trends.length === 0 ? <div className="empty-state">Belum ada analisis dalam 30 hari terakhir.</div> : (
            <div className="risk-trend" aria-label="Grafik tren risiko 30 hari">
              {data.trends.map((item) => (
                <div key={item.date} title={`${formatShortDate(item.date)}: risiko ${item.averageRisk}, ${item.analyses} analisis`}>
                  <span>{item.averageRisk}</span>
                  <i style={{ height: `${Math.max(8, (item.averageRisk / maxTrend) * 100)}%` }} />
                  <small>{formatShortDate(item.date)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="neon-card model-evaluation-card">
        <div className="admin-section-title">
          <div>
            <span className="eyebrow">MODEL READINESS &amp; EVALUATION</span>
            <h2>Gerbang supervised ML</h2>
          </div>
          <span className={data.evaluation.readiness.ready ? "ml-ready" : "ml-locked"}>
            <BrainCircuit size={16} />
            {data.evaluation.readiness.ready ? "SIAP EKSPERIMEN ML" : "ML BELUM DIAKTIFKAN"}
          </span>
        </div>
        <p className="evaluation-copy">
          XGBoost/LightGBM hanya boleh diuji setelah label manusia cukup dan kedua kelas terwakili.
          Engine hybrid statistik tetap aktif selama gerbang ini terkunci.
        </p>
        <div className="evaluation-metrics">
          <div><span>Label valid</span><strong>{data.evaluation.sampleSize}</strong><small>target {data.evaluation.readiness.minimumLabels}</small></div>
          <div><span>Bermasalah</span><strong>{data.evaluation.positives}</strong><small>target {data.evaluation.readiness.minimumPerClass}</small></div>
          <div><span>Aman</span><strong>{data.evaluation.negatives}</strong><small>target {data.evaluation.readiness.minimumPerClass}</small></div>
          <div><span>Precision</span><strong>{data.evaluation.precision === null ? "N/A" : `${Math.round(data.evaluation.precision * 100)}%`}</strong></div>
          <div><span>Recall</span><strong>{data.evaluation.recall === null ? "N/A" : `${Math.round(data.evaluation.recall * 100)}%`}</strong></div>
          <div><span>F1</span><strong>{data.evaluation.f1 === null ? "N/A" : data.evaluation.f1.toFixed(2)}</strong></div>
          <div><span>PR-AUC</span><strong>{data.evaluation.prAuc === null ? "N/A" : data.evaluation.prAuc.toFixed(2)}</strong></div>
          <div><span>False positive</span><strong>{data.evaluation.falsePositiveRate === null ? "N/A" : `${Math.round(data.evaluation.falsePositiveRate * 100)}%`}</strong></div>
          <div><span>Brier score</span><strong>{data.evaluation.brierScore === null ? "N/A" : data.evaluation.brierScore.toFixed(3)}</strong><small>lebih kecil lebih baik</small></div>
        </div>
        <div className="calibration-grid" aria-label="Kalibrasi skor risiko">
          {data.evaluation.calibration.map((bucket) => (
            <div key={bucket.range}>
              <span>Skor {bucket.range}</span>
              <strong>{bucket.count}</strong>
              <small>prediksi {Math.round(bucket.predictedRate * 100)}% · aktual {Math.round(bucket.observedRate * 100)}%</small>
            </div>
          ))}
        </div>
        {!data.evaluation.readiness.ready && (
          <ul className="readiness-reasons">
            {data.evaluation.readiness.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}
      </section>

      <section className="neon-card review-queue-card">
        <div className="admin-section-title"><div><span className="eyebrow">REVIEW QUEUE</span><h2>Transaksi untuk diverifikasi</h2></div><span>{data.transactions.length} dari {data.metrics.total} transaksi terbaru</span></div>
        {data.transactions.length === 0 ? <div className="empty-state">Belum ada transaksi untuk direview.</div> : (
          <div className="review-list">
            {data.transactions.map((item) => (
              <article key={item.id} className={item.reviewStatus === "PENDING" ? "pending" : "reviewed"}>
                <div className="review-transaction-head">
                  <div><strong>{item.orderId || item.customerName}</strong><small>{item.customerName} · {item.city || "Kota tidak diisi"}</small></div>
                  <span className={`status ${riskLabelClass(item.label)}`}>{item.riskScore}/100 · {item.label}</span>
                </div>
                <p>{rupiah.format(item.amount)} · {item.paymentMethod} · {formatDate(item.transactionTime)} WIB</p>
                <ReviewControls transactionId={item.id} initialFeedback={item.feedback} initialStatus={item.reviewStatus} initialNote={item.reviewNote} />
                <Link className="text-link" href={`/report?id=${item.analysisId}`}>Buka laporan lengkap</Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="neon-card audit-card">
        <div className="admin-section-title"><div><span className="eyebrow">AUDIT LOG</span><h2>Jejak perubahan review</h2></div><span>{data.audit.length} aktivitas terbaru</span></div>
        {data.audit.length === 0 ? <div className="empty-state">Audit log akan muncul setelah review pertama disimpan.</div> : (
          <ol>
            {data.audit.map((item) => (
              <li key={item.id}>
                <time dateTime={item.createdAt}>{formatDate(item.createdAt)} WIB</time>
                <strong>{item.transactionLabel}</strong>
                <span>{item.oldFeedback} → {item.newFeedback} · {item.oldReviewStatus} → {item.newReviewStatus}</span>
                {item.note && <p>{item.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
