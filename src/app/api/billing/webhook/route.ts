import { NextRequest, NextResponse } from "next/server";
import {
  parseMidtransStatus,
  verifyNotificationSignature,
} from "@/lib/midtrans";
import { synchronizePayment } from "@/lib/payment-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const notification = parseMidtransStatus(await request.json());
    if (!notification.success || !verifyNotificationSignature(notification.data)) {
      return NextResponse.json({ error: "Notifikasi tidak valid." }, { status: 401 });
    }

    await synchronizePayment(notification.data.order_id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Midtrans webhook failed", error);
    return NextResponse.json({ error: "Notifikasi belum dapat diproses." }, { status: 500 });
  }
}
