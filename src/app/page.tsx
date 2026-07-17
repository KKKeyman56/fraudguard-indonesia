import Link from "next/link";
import { ArrowRight, Bot, Check, FileDown, FileSpreadsheet, Fingerprint, Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PainPointSection } from "@/components/PainPointSection";

const features = [
  { icon: FileSpreadsheet, title: "Analisis massal", copy: "Upload CSV atau Excel dan periksa hingga 50 transaksi sekaligus." },
  { icon: Bot, title: "Insight bahasa manusia", copy: "Dapatkan alasan risiko dan langkah yang mudah dipahami, bukan angka saja." },
  { icon: FileDown, title: "Laporan siap pakai", copy: "Unduh hasil menjadi PDF untuk arsip, tim operasional, atau pemilik usaha." },
];

export default function Home() {
  return (
    <main>
      <section className="hero grid-bg">
        <div className="hero-copy">
          <span className="terminal-line">SYSTEM ONLINE // AI RISK MONITOR AKTIF</span>
          <h1 className="glitch" data-text="Lindungi Bisnis dari Fraud Transaksi">Lindungi Bisnis dari <em>Fraud Transaksi</em></h1>
          <p>FraudGuard membantu pemilik UMKM mengenali pola transaksi mencurigakan dalam hitungan detik—dengan penjelasan sederhana dan tindakan yang jelas.</p>
          <div className="hero-actions"><Link className="button" href="/analyze"><Radar size={19} /> Coba Analisis Gratis</Link><Link className="button button-ghost" href="#cara-kerja">Lihat cara kerja <ArrowRight size={18} /></Link></div>
          <div className="trust-row"><span><ShieldCheck size={16} /> API key aman di server</span><span><Zap size={16} /> Hasil cepat</span><span><Fingerprint size={16} /> Kontrol tetap pada Anda</span></div>
        </div>
        <div className="hero-visual neon-card" aria-label="Pratinjau pemantauan risiko">
          <div className="terminal-top"><i /><i /><i /><span>fraudguard.ai / live-monitor</span></div>
          <div className="radar-core"><div className="radar-ring r1" /><div className="radar-ring r2" /><div className="radar-ring r3" /><div className="radar-sweep" /><ShieldCheck size={42} /></div>
          <div className="monitor-row"><span>Transaksi dipindai</span><strong>1.248</strong></div>
          <div className="monitor-row"><span>Sinyal risiko</span><strong className="danger-text">17</strong></div>
          <div className="monitor-status"><span /> Perlindungan aktif</div>
        </div>
      </section>

      <section className="stats-strip"><div><strong>≤ 50</strong><span>transaksi per batch</span></div><div><strong>3</strong><span>tingkat risiko yang jelas</span></div><div><strong>24/7</strong><span>siap membantu operasional</span></div></section>

      <PainPointSection />

      <section className="section" id="fitur"><div className="section-heading"><div><span className="eyebrow">FITUR INTI</span><h2>Bukan sekadar skor. <em>Insight untuk bertindak.</em></h2></div><p>Dibuat untuk pemilik toko dan tim operasional yang tidak perlu memahami istilah teknis.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, copy }, index) => <article className="neon-card feature-card" key={title}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

      <section className="section how" id="cara-kerja"><div><span className="eyebrow">CARA KERJA</span><h2>Tiga langkah untuk keputusan yang lebih aman.</h2><p>Anda tetap memegang keputusan akhir. FraudGuard memberi sinyal dan konteks agar verifikasi lebih cepat.</p><Link className="text-link" href="/analyze">Mulai sekarang <ArrowRight size={17} /></Link></div><ol><li><span>01</span><div><h3>Masukkan transaksi</h3><p>Upload file atau isi satu transaksi secara manual.</p></div></li><li><span>02</span><div><h3>AI mencari pola risiko</h3><p>Nominal, waktu, metode, kota, dan catatan dibaca bersama.</p></div></li><li><span>03</span><div><h3>Terima insight & laporan</h3><p>Periksa alasan, rekomendasi, lalu simpan laporan PDF.</p></div></li></ol></section>

      <section className="section pricing" id="harga"><div className="section-heading centered"><div><span className="eyebrow">PAKET</span><h2>Mulai kecil. Naik saat bisnis tumbuh.</h2></div></div><div className="pricing-grid">
        <article className="neon-card price-card"><h3>Gratis</h3><strong>Rp0<span>/bulan</span></strong><ul><li><Check />50 analisis</li><li><Check />Insight dasar</li><li><Check />Export PDF</li></ul><Link className="button button-ghost" href="/analyze">Mulai gratis</Link></article>
        <article className="neon-card price-card featured"><span className="badge">PALING COCOK UNTUK UMKM</span><h3>Pro</h3><strong>Rp99rb<span>/bulan</span></strong><ul><li><Check />5.000 analisis</li><li><Check />Insight AI detail</li><li><Check />Riwayat dan laporan</li></ul><Link className="button" href="/analyze">Coba Pro</Link></article>
        <article className="neon-card price-card"><h3>Enterprise</h3><strong>Kustom</strong><ul><li><Check />Volume khusus</li><li><Check />Integrasi sistem</li><li><Check />Dukungan prioritas</li></ul><a className="button button-ghost" href="mailto:halo@fraudguard.id">Hubungi kami</a></article>
      </div><p className="pricing-note">Paket dan pembayaran masih tahap validasi bisnis. Tidak ada tagihan tanpa persetujuan Anda.</p></section>

      <section className="cta neon-card"><Sparkles /><div><span className="eyebrow">SIAP MEMULAI?</span><h2>Periksa transaksi pertama Anda sekarang.</h2><p>Gunakan data contoh jika belum memiliki file.</p></div><Link className="button" href="/analyze">Buka FraudGuard <ArrowRight /></Link></section>
      <footer><Link className="brand" href="/"><ShieldCheck /> FraudGuard</Link><p>AI penjaga transaksi untuk UMKM Indonesia.</p><span>© 2026 FraudGuard. Hasil AI memerlukan verifikasi manusia.</span></footer>
    </main>
  );
}
