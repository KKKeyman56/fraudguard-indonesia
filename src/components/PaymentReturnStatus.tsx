"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

const terminalStatuses = new Set(["paid", "denied", "cancelled", "expired", "failed", "refunded"]);

export function PaymentReturnStatus({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "pending" | "paid" | "error">("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    async function synchronize() {
      attempt += 1;
      try {
        const response = await fetch(`/api/billing/status?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        const body = await response.json() as { status?: unknown };
        if (!response.ok || typeof body.status !== "string") throw new Error("PAYMENT_SYNC_FAILED");
        if (cancelled) return;

        if (body.status === "paid") {
          setState("paid");
          router.refresh();
          return;
        }
        if (terminalStatuses.has(body.status)) {
          setState("error");
          router.refresh();
          return;
        }
        setState("pending");
        if (attempt < 5) timer = setTimeout(synchronize, 2500);
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void synchronize();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, router]);

  if (state === "paid") return <div className="payment-return success" role="status">
    <CheckCircle2 size={19} />
    <div><strong>Pembayaran berhasil</strong><span>Paket telah aktif dan kuota baru siap digunakan.</span></div>
  </div>;

  if (state === "error") return <div className="payment-return error" role="alert">
    <TriangleAlert size={19} />
    <div><strong>Status belum dapat dipastikan</strong><span>Cek riwayat pembayaran atau muat ulang halaman. Paket hanya aktif setelah pembayaran terverifikasi.</span></div>
  </div>;

  return <div className="payment-return" role="status">
    <LoaderCircle className="spin" size={19} />
    <div><strong>{state === "checking" ? "Memeriksa pembayaran" : "Pembayaran masih diproses"}</strong><span>FraudGuard sedang mencocokkan status langsung dengan server Midtrans.</span></div>
  </div>;
}
