"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { reviewManualPaymentAction, type ReviewPaymentState } from "@/app/admin/payments/actions";

const initialState: ReviewPaymentState = { ok: false, message: "" };

export function ManualPaymentReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(reviewManualPaymentAction, initialState);
  return <form className="manual-review-form" action={action}>
    <input type="hidden" name="orderId" value={orderId} />
    <label>Catatan admin (opsional)<input name="note" maxLength={500} placeholder="Contoh: nominal dan rekening pengirim sesuai" /></label>
    <div>
      <button className="button button-small" name="decision" value="approved" disabled={pending}><CheckCircle2 size={15} /> Setujui & aktifkan</button>
      <button className="button button-small danger-button" name="decision" value="rejected" disabled={pending}><XCircle size={15} /> Tolak</button>
    </div>
    {state.message && <p className={state.ok ? "action-success" : "action-error"}>{state.message}</p>}
  </form>;
}
