import Link from "next/link";
import { ArrowRight, Bot, BookOpen, CheckCircle2, FileDown, FileSpreadsheet, Fingerprint, Radar, ShieldCheck, Sparkles, XCircle, Zap } from "lucide-react";
import { PainPointSection } from "@/components/PainPointSection";
import { BrandMark } from "@/components/BrandMark";
import { educationArticles } from "@/lib/education-content";

const features = [
  { icon: FileSpreadsheet, title: "Analisis massal", copy: "Upload CSV atau Excel dan periksa hingga 50 transaksi sekaligus." },
  { icon: Bot, title: "Insight bahasa manusia", copy: "Dapatkan alasan risiko dan langkah yang mudah dipahami, bukan angka saja." },
  { icon: FileDown, title: "Laporan siap pakai", copy: "Unduh hasil menjadi PDF untuk arsip, tim operasional, atau pemilik usaha." },
];

const faqItems = [
  {
    question: "Apa itu FraudGuard?",
    answer: "FraudGuard adalah aplikasi analisis risiko transaksi untuk UMKM Indonesia. Sistem membaca data transaksi dan memberi skor, status, alasan, serta rekomendasi verifikasi agar pemilik usaha dapat meninjau transaksi mencurigakan lebih cepat.",
  },
  {
    question: "Apakah FraudGuard mengecek rekening, nomor HP, atau toko penipu?",
    answer: "Tidak. FraudGuard bukan layanan pencarian blacklist rekening, nomor telepon, atau toko. FraudGuard menganalisis pola dari data transaksi yang Anda masukkan, seperti nominal, metode pembayaran, waktu, kota, dan catatan transaksi.",
  },
  {
    question: "Data apa yang dapat dianalisis?",
    answer: "Anda dapat memasukkan transaksi secara manual atau mengunggah CSV/Excel. Data yang relevan meliputi nama pelanggan, nominal, metode pembayaran, waktu transaksi, kota, dan catatan pendukung.",
  },
  {
    question: "Apakah status RISIKO TINGGI berarti transaksi pasti fraud?",
    answer: "Tidak. Status dan skor adalah rekomendasi penyaringan awal, bukan vonis. Verifikasi bukti pembayaran, identitas, percakapan, dan riwayat pesanan sebelum mengambil keputusan final.",
  },
  {
    question: "Siapa yang cocok menggunakan FraudGuard?",
    answer: "Pemilik toko online, reseller, bisnis jasa, dan tim operasional UMKM yang ingin meninjau transaksi berisiko tanpa harus memahami machine learning atau istilah teknis.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://fraudguard-indonesia.vercel.app/#organization",
      name: "FraudGuard Indonesia",
      url: "https://fraudguard-indonesia.vercel.app/",
      description: "Penyedia aplikasi analisis risiko transaksi berbasis AI untuk UMKM Indonesia.",
    },
    {
      "@type": "WebSite",
      "@id": "https://fraudguard-indonesia.vercel.app/#website",
      url: "https://fraudguard-indonesia.vercel.app/",
      name: "FraudGuard",
      inLanguage: "id-ID",
      publisher: { "@id": "https://fraudguard-indonesia.vercel.app/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://fraudguard-indonesia.vercel.app/#software",
      name: "FraudGuard",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Analisis risiko transaksi",
      operatingSystem: "Web",
      url: "https://fraudguard-indonesia.vercel.app/",
      inLanguage: "id-ID",
      description: "Aplikasi analisis pola transaksi mencurigakan dengan insight AI untuk UMKM Indonesia.",
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Pemilik dan tim operasional UMKM Indonesia",
      },
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "198000",
        priceCurrency: "IDR",
        offerCount: "3",
      },
      provider: { "@id": "https://fraudguard-indonesia.vercel.app/#organization" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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

      <section className="section identity-section" id="tentang">
        <div className="section-heading">
          <div><span className="eyebrow">POSISI PRODUK</span><h2>Apa sebenarnya <em>FraudGuard?</em></h2></div>
          <p>Alat bantu screening transaksi untuk UMKM—bukan database blacklist dan bukan pengganti keputusan manusia.</p>
        </div>
        <div className="identity-grid">
          <article className="neon-card identity-card identity-do">
            <CheckCircle2 />
            <h3>Yang FraudGuard lakukan</h3>
            <ul>
              <li>Menganalisis pola dari data transaksi yang Anda masukkan.</li>
              <li>Memberi skor risiko AMAN, WASPADA, atau RISIKO TINGGI.</li>
              <li>Menjelaskan sinyal risiko dan langkah verifikasi yang relevan.</li>
              <li>Menyimpan riwayat dan laporan untuk kebutuhan operasional.</li>
            </ul>
          </article>
          <article className="neon-card identity-card identity-dont">
            <XCircle />
            <h3>Yang bukan fungsi FraudGuard</h3>
            <ul>
              <li>Bukan pencarian blacklist rekening atau nomor telepon.</li>
              <li>Bukan alat untuk menyatakan seseorang pasti penipu.</li>
              <li>Bukan perlindungan hacker, malware, atau infrastruktur IT.</li>
              <li>Tidak menggantikan pengecekan bukti dan keputusan manusia.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section" id="fitur"><div className="section-heading"><div><span className="eyebrow">FITUR INTI</span><h2>Bukan sekadar skor. <em>Insight untuk bertindak.</em></h2></div><p>Dibuat untuk pemilik toko dan tim operasional yang tidak perlu memahami istilah teknis.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, copy }, index) => <article className="neon-card feature-card" key={title}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

      <section className="section how" id="cara-kerja"><div><span className="eyebrow">CARA KERJA</span><h2>Tiga langkah untuk keputusan yang lebih aman.</h2><p>Anda tetap memegang keputusan akhir. FraudGuard memberi sinyal dan konteks agar verifikasi lebih cepat.</p><Link className="text-link" href="/analyze">Mulai sekarang <ArrowRight size={17} /></Link></div><ol><li><span>01</span><div><h3>Masukkan transaksi</h3><p>Upload file atau isi satu transaksi secara manual.</p></div></li><li><span>02</span><div><h3>AI mencari pola risiko</h3><p>Nominal, waktu, metode, kota, dan catatan dibaca bersama.</p></div></li><li><span>03</span><div><h3>Terima insight & laporan</h3><p>Periksa alasan, rekomendasi, lalu simpan laporan PDF.</p></div></li></ol></section>

      <section className="section education-preview">
        <div className="section-heading">
          <div><span className="eyebrow">PUSAT EDUKASI</span><h2>Kenali fraud sebelum <em>bisnis merugi.</em></h2></div>
          <Link className="text-link" href="/edukasi">Lihat semua panduan <ArrowRight size={17} /></Link>
        </div>
        <div className="education-grid">
          {educationArticles.slice(0, 3).map((article) => (
            <article className="neon-card education-card" key={article.slug}>
              <BookOpen />
              <span>{article.readingTime} · {article.category}</span>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <Link className="text-link" href={`/edukasi/${article.slug}`}>Baca panduan <ArrowRight size={15} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading"><div><span className="eyebrow">PERTANYAAN UMUM</span><h2>Jawaban jelas sebelum <em>Anda mulai.</em></h2></div><p>Informasi ini membantu pemilik usaha memahami kemampuan dan batas FraudGuard.</p></div>
        <div className="faq-list">
          {faqItems.map((item) => <details className="neon-card" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
        </div>
      </section>

      <section className="cta neon-card"><Sparkles /><div><span className="eyebrow">SIAP MEMULAI?</span><h2>Periksa transaksi pertama Anda sekarang.</h2><p>Gunakan data contoh jika belum memiliki file.</p></div><Link className="button" href="/analyze">Buka FraudGuard <ArrowRight /></Link></section>
      <footer><Link className="brand" href="/" aria-label="FraudGuard beranda"><BrandMark /> FraudGuard</Link><p>AI penjaga transaksi untuk UMKM Indonesia.</p><Link href="/edukasi">Pusat Edukasi</Link><span>© 2026 FraudGuard. Hasil AI memerlukan verifikasi manusia.</span></footer>
    </main>
  );
}
