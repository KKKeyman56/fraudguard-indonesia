"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { PurchasablePlan } from "@/lib/payment-plans";

export function PurchasePlanButton({ plan }: { plan: PurchasablePlan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, acceptTerms: accepted }),
      });
      const rawBody = await response.text();
      let data: { redirectUrl?: unknown; error?: unknown } = {};
      if (rawBody) {
        try {
          data = JSON.parse(rawBody) as { redirectUrl?: unknown; error?: unknown };
        } catch {
          throw new Error("Server pembayaran mengirim respons yang tidak valid. Coba lagi beberapa saat.");
        }
      }
      if (!response.ok || typeof data.redirectUrl !== "string") {
        throw new Error(typeof data.error === "string"
          ? data.error
          : `Pembayaran belum dapat dimulai${response.status ? ` (HTTP ${response.status})` : ""}.`);
      }
      window.location.assign(data.redirectUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Pembayaran belum dapat dimulai.");
      setLoading(false);
    }
  }

  return <div className="purchase-action">
    <label className="payment-consent">
      <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
      <span>Saya menyetujui <Link href="/terms">ketentuan pembayaran</Link>: satu kali bayar, aktif 30 hari, dan tidak diperpanjang otomatis.</span>
    </label>
    <button className="button" type="button" onClick={checkout} disabled={loading || !accepted}>
      {loading ? <><LoaderCircle className="spin" size={16} /> Membuka pembayaran...</> : <>Lanjut ke pembayaran <ArrowRight size={16} /></>}
    </button>
    {error && <p className="payment-error" role="alert">{error}</p>}
  </div>;
}
