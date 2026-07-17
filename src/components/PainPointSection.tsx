"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { CreditCard, Repeat2, ShieldOff, TriangleAlert } from "lucide-react";

const painPoints = [
  {
    icon: ShieldOff,
    tone: "danger",
    title: "Pembeli Penipu",
    description:
      "Bukti transfer palsu, screenshot editan, akun marketplace bodong, order fiktif yang tidak pernah dibayar. FraudGuard mendeteksi pola pembeli mencurigakan sebelum lo kirim barang dan rugi.",
    tags: ["#fraud-buyer", "#bukti-palsu"],
  },
  {
    icon: CreditCard,
    tone: "warning",
    title: "Chargeback Fraud",
    description:
      "Pembeli menerima barang, lalu mengklaim ke bank bahwa transaksi tidak pernah terjadi. Lo kehilangan barang sekaligus uang. FraudGuard mencatat pola transaksi mencurigakan sejak awal sebagai bukti.",
    tags: ["#chargeback", "#dispute"],
  },
  {
    icon: Repeat2,
    tone: "purple",
    title: "Pencucian Uang",
    description:
      "Toko lo tanpa sadar dijadikan kedok untuk memecah dan menyamarkan uang ilegal melalui transaksi kecil-kecil yang terlihat normal. FraudGuard mendeteksi pola transaksi berulang yang tidak wajar sebelum lo terjerat masalah hukum.",
    tags: ["#money-laundering", "#smurfing"],
  },
  {
    icon: TriangleAlert,
    tone: "warning",
    title: "Pola Transaksi Aneh",
    description:
      "Nominal tidak wajar untuk jenis produk lo, transaksi terus-menerus dini hari, pembeli baru langsung order jutaan rupiah, atau lokasi pengiriman yang tidak konsisten. Semua anomali ini terpantau otomatis oleh FraudGuard.",
    tags: ["#anomali", "#pola-mencurigakan"],
  },
] as const;

export function PainPointSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) {
      section?.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section pain-section" id="risiko-transaksi" ref={sectionRef}>
      <div className="section-heading pain-heading">
        <div>
          <span className="eyebrow">RISIKO YANG SERING TERJADI</span>
          <h2>
            FraudGuard Melindungi Bisnis Lo <em>Dari...</em>
          </h2>
        </div>
        <p>
          Ribuan UMKM Indonesia rugi jutaan rupiah setiap tahun karena 4 masalah ini. FraudGuard hadir untuk
          mendeteksinya sebelum terlambat.
        </p>
      </div>

      <div className="pain-grid">
        {painPoints.map(({ icon: Icon, tone, title, description, tags }, index) => (
          <article className="pain-card" key={title} style={{ "--reveal-order": index } as CSSProperties}>
            <div className={`pain-icon ${tone}`} aria-hidden="true">
              <Icon size={25} strokeWidth={1.9} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="pain-tags" aria-label={`Tag ${title}`}>
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="human-review-note">
        FraudGuard memberikan rekomendasi — keputusan final tetap di tangan Anda.
      </p>
    </section>
  );
}
