"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, LoaderCircle, Plus, Send, Sparkles, Upload, X } from "lucide-react";
import { createSampleTransactions, parseTransactionFile } from "@/lib/parser";
import { useAnalysisStore } from "@/store/analysis-store";
import type { ApiErrorPayload, BatchAnalysis, Transaction } from "@/types/transaction";
import { ResultsPanel } from "@/components/ResultsPanel";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function AnalyzeWorkspace() {
  const { transactions, analysis, setTransactions, setAnalysis, reset } = useAnalysisStore();
  const [tab, setTab] = useState<"file" | "manual">("file");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { aiConfigured?: boolean }) => setAiReady(Boolean(data.aiConfigured)))
      .catch(() => setAiReady(null));
  }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    setMessage(null);
    try {
      setTransactions(await parseTransactionFile(file));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File tidak dapat dibaca.");
    }
  }

  function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nominal = Number(form.get("nominal"));
    if (!Number.isFinite(nominal) || nominal < 0) return setMessage("Nominal harus berupa angka positif.");
    const item: Transaction = {
      id: `MAN-${Date.now()}`,
      pelanggan: String(form.get("pelanggan") || "").trim(),
      nominal,
      metode: String(form.get("metode") || "").trim(),
      waktu: String(form.get("waktu") || "").trim(),
      kota: String(form.get("kota") || "").trim() || undefined,
      catatan: String(form.get("catatan") || "").trim() || undefined,
    };
    if (!item.pelanggan || !item.metode || !item.waktu) return setMessage("Lengkapi pelanggan, metode, dan waktu.");
    if (transactions.length >= 50) return setMessage("Maksimal 50 transaksi per analisis.");
    setTransactions([...transactions, item]);
    event.currentTarget.reset();
    setMessage(null);
  }

  async function analyze() {
    if (!transactions.length) return setMessage("Tambahkan minimal satu transaksi.");
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      const raw = await response.text();
      const payload = JSON.parse(raw) as BatchAnalysis | ApiErrorPayload;
      if (!response.ok) throw new Error((payload as ApiErrorPayload).error || "Analisis gagal.");
      setAnalysis(payload as BatchAnalysis);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Koneksi ke AI gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (analysis) return <ResultsPanel analysis={analysis} onReset={reset} />;

  return (
    <div className="analyze-layout">
      <section className="neon-card input-card">
        {aiReady === false && <div className="alert" role="status">AI belum diaktifkan. Administrator perlu menambahkan GROQ_API_KEY di Vercel.</div>}
        <div className="tabs" role="tablist">
          <button className={tab === "file" ? "active" : ""} onClick={() => setTab("file")} role="tab"><Upload size={17} /> Upload CSV/Excel</button>
          <button className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")} role="tab"><Plus size={17} /> Input manual</button>
        </div>
        {tab === "file" ? (
          <div className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files[0]); }}>
            <FileSpreadsheet size={42} aria-hidden="true" />
            <h2>Letakkan file transaksi di sini</h2>
            <p>CSV atau XLSX • maksimal 50 transaksi</p>
            <input ref={inputRef} hidden type="file" accept=".csv,.xlsx" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button className="button button-ghost" onClick={() => inputRef.current?.click()}>Pilih file</button>
            <button className="text-button" onClick={() => setTransactions(createSampleTransactions())}><Sparkles size={16} /> Gunakan 5 data contoh</button>
            <small>Kolom wajib: pelanggan, nominal, metode, waktu. Opsional: kota, catatan. Hindari data sensitif seperti nomor kartu, PIN, atau kata sandi.</small>
          </div>
        ) : (
          <form className="manual-form" onSubmit={addManual}>
            <label>Nama pelanggan<input name="pelanggan" placeholder="Contoh: Siti Rahma" required /></label>
            <label>Nominal (Rp)<input name="nominal" type="number" min="0" step="1" placeholder="1500000" required /></label>
            <label>Metode<select name="metode" required><option value="">Pilih metode</option><option>Transfer bank</option><option>QRIS</option><option>Virtual account</option><option>Kartu kredit</option><option>COD</option><option>E-wallet</option></select></label>
            <label>Waktu<input name="waktu" type="datetime-local" required /></label>
            <label>Kota<input name="kota" placeholder="Jakarta" /></label>
            <label className="span-2">Catatan<textarea name="catatan" rows={3} placeholder="Misalnya: akun baru, minta kirim cepat" /></label>
            <button className="button span-2" type="submit"><Plus size={18} /> Tambahkan transaksi</button>
          </form>
        )}
        {message && <div className="alert" role="alert">{message}</div>}
      </section>

      <aside className="neon-card queue-card">
        <div className="section-heading compact"><div><span className="eyebrow">ANTREAN</span><h2>Transaksi siap dianalisis</h2></div><strong>{transactions.length}/50</strong></div>
        {!transactions.length ? <div className="empty-state">Belum ada data. Upload file atau isi transaksi manual.</div> : (
          <div className="queue-list">{transactions.map((item) => <div className="queue-item" key={item.id}><div><strong>{item.pelanggan}</strong><span>{rupiah.format(item.nominal)} • {item.metode}</span></div><button aria-label={`Hapus ${item.pelanggan}`} onClick={() => setTransactions(transactions.filter((row) => row.id !== item.id))}><X size={16} /></button></div>)}</div>
        )}
        <button className="button analyze-button" disabled={!transactions.length || loading || aiReady === false} onClick={() => void analyze()}>
          {loading ? <><LoaderCircle className="spin" size={19} /> AI sedang menganalisis...</> : <><Send size={18} /> Analisis dengan AI</>}
        </button>
        {loading && <p className="loading-note">Biasanya selesai dalam beberapa detik. Jangan tutup halaman ini.</p>}
      </aside>
    </div>
  );
}
