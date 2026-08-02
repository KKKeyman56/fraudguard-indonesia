import "server-only";

import { getTransactionStatus, mapPaymentStatus } from "@/lib/midtrans";
import { createAdminClient } from "@/lib/supabase/admin";

export async function synchronizePayment(orderId: string) {
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("order_id, user_id, amount")
    .eq("order_id", orderId)
    .maybeSingle();

  if (paymentError) throw new Error(`PAYMENT_READ_FAILED:${paymentError.code}`);
  if (!payment) return null;

  const current = await getTransactionStatus(payment.order_id);
  const currentAmount = Number.parseFloat(current.gross_amount);
  if (current.order_id !== payment.order_id || currentAmount !== Number(payment.amount)) {
    throw new Error("PAYMENT_DATA_MISMATCH");
  }

  const status = mapPaymentStatus(current);
  const { error: applyError } = await admin.rpc("apply_midtrans_payment_status", {
    p_order_id: payment.order_id,
    p_status: status,
    p_transaction_id: current.transaction_id ?? null,
    p_transaction_status: current.transaction_status,
    p_payment_type: current.payment_type ?? null,
    p_fraud_status: current.fraud_status ?? null,
  });
  if (applyError) throw new Error(`PAYMENT_APPLY_FAILED:${applyError.code}`);

  return { status, userId: String(payment.user_id) };
}
