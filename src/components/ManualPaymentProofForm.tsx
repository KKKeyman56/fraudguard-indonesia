"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Upload } from "lucide-react";

export function ManualPaymentProofForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);
    const formData = new FormData(event.currentTarget);
    formData.set("orderId", orderId);

    try {
      const response = await fetch("/api/billing/manual-proof", { method: "POST", body: formData });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) as { error?: unknown } : {};
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Bukti transfer belum dapat diunggah.");
      setSuccess(true);
      setMessage("Bukti terkirim. Admin akan memeriksanya sebelum paket diaktifkan.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bukti transfer belum dapat diunggah.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="manual-proof-form" onSubmit={submit}>
    <label>
      Bukti transfer
      <input name="proof" type="file" accept="image/jpeg,image/png,application/pdf" required />
      <small>Format JPG, PNG, atau PDF. Maksimal 5 MB. Pastikan nominal dan waktu transfer terlihat.</small>
    </label>
    <button className="button" type="submit" disabled={loading}>
      {loading ? <><LoaderCircle className="spin" size={16} /> Mengunggah...</> : <><Upload size={16} /> Kirim bukti transfer</>}
    </button>
    {message && <p className={success ? "manual-proof-success" : "payment-error"} role={success ? "status" : "alert"}>
      {success && <CheckCircle2 size={15} />} {message}
    </p>}
  </form>;
}
