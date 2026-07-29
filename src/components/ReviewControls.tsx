"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import type { ReviewStatus, TransactionFeedback } from "@/types/transaction";

export function ReviewControls({
  transactionId,
  initialFeedback = "UNKNOWN",
  initialStatus = "PENDING",
  initialNote = "",
}: {
  transactionId: string;
  initialFeedback?: TransactionFeedback;
  initialStatus?: ReviewStatus;
  initialNote?: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<TransactionFeedback>(initialFeedback);
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(transactionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, status, note: note.trim() || undefined }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Review gagal disimpan.");
      setMessage("Review tersimpan dan audit log diperbarui.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review gagal disimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="review-controls" onSubmit={submit}>
      <label>
        Hasil verifikasi
        <select value={feedback} onChange={(event) => setFeedback(event.target.value as TransactionFeedback)}>
          <option value="UNKNOWN">Belum diketahui</option>
          <option value="SAFE">Aman</option>
          <option value="PROBLEM">Bermasalah</option>
        </select>
      </label>
      <label>
        Status review
        <select value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus)}>
          <option value="PENDING">Perlu ditinjau</option>
          <option value="REVIEWED">Selesai ditinjau</option>
        </select>
      </label>
      <label className="review-note">
        Catatan internal
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} placeholder="Contoh: pembayaran sudah cocok di mutasi bank" />
      </label>
      <button className="button button-small" disabled={loading} type="submit">
        {loading ? <LoaderCircle className="spin" size={15} /> : <CheckCircle2 size={15} />}
        Simpan review
      </button>
      {message && <small role="status">{message}</small>}
    </form>
  );
}
