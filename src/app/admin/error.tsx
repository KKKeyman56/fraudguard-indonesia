"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell section admin-error-shell">
      <section className="neon-card admin-error-card">
        <AlertTriangle size={36} aria-hidden="true" />
        <span className="eyebrow">ADMIN SERVICE</span>
        <h1>Dashboard belum dapat dimuat</h1>
        <p>
          Statistik admin sedang tidak tersedia. Data pengguna dan analisis Anda
          tidak berubah.
        </p>
        <button className="button primary" type="button" onClick={reset}>
          <RefreshCw size={17} aria-hidden="true" /> Coba lagi
        </button>
      </section>
    </main>
  );
}
