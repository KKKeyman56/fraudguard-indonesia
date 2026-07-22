import { NextRequest, NextResponse } from "next/server";
import {
  getTransactionStatus,
  mapPaymentStatus,
  parseMidtransStatus,
  verifyNotificationSignature,
} from "@/lib/midtrans";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const notification = parseMidtransStatus(await request.json());
    if (!notification.success || !verifyNotificationSignature(notification.data)) {
      return NextResponse.json({ error: "Notifikasi tidak valid." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("order_id, amount")
      .eq("order_id", notification.data.order_id)
      .maybeSingle();
    if (paymentError) throw new Error(`PAYMENT_READ_FAILED:${paymentError.code}`);
    if (!payment) return NextResponse.json({ received: true });

    const current = await getTransactionStatus(payment.order_id);
    const currentAmount = Number.parseFloat(current.gross_amount);
    if (current.order_id !== payment.order_id || currentAmount !== Number(payment.amount)) {
      console.error("Midtrans amount or order mismatch", payment.order_id);
      return NextResponse.json({ error: "Data transaksi tidak cocok." }, { status: 409 });
    }

    const { error: applyError } = await admin.rpc("apply_midtrans_payment_status", {
      p_order_id: payment.order_id,
      p_status: mapPaymentStatus(current),
      p_transaction_id: current.transaction_id ?? null,
      p_transaction_status: current.transaction_status,
      p_payment_type: current.payment_type ?? null,
      p_fraud_status: current.fraud_status ?? null,
    });
    if (applyError) throw new Error(`PAYMENT_APPLY_FAILED:${applyError.code}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Midtrans webhook failed", error);
    return NextResponse.json({ error: "Notifikasi belum dapat diproses." }, { status: 500 });
  }
}
