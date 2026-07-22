"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { PurchasablePlan } from "@/lib/midtrans";

export function PurchasePlanButton({ plan }: { plan: PurchasablePlan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result: unknown = await response.json();
      const data = result as { redirectUrl?: unknown; error?: unknown };
      if (!response.ok || typeof data.redirectUrl !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "Pembayaran belum dapat dimulai.");
      }
      window.location.assign(data.redirectUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Pembayaran belum dapat dimulai.");
      setLoading(false);
    }
  }

  return <div className="purchase-action">
    <button className="button" type="button" onClick={checkout} disabled={loading}>
      {loading ? <><LoaderCircle className="spin" size={16} /> Membuka Midtrans...</> : <>Bayar dengan Midtrans <ArrowRight size={16} /></>}
    </button>
    {error && <p className="payment-error" role="alert">{error}</p>}
  </div>;
}
