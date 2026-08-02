import { NextRequest, NextResponse } from "next/server";
import { getVerifiedClaims } from "@/lib/auth";
import { synchronizePayment } from "@/lib/payment-service";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const claims = await getVerifiedClaims();
  if (!claims?.sub) {
    return NextResponse.json({ error: "Silakan masuk untuk memeriksa pembayaran." }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId || orderId.length > 80) {
    return NextResponse.json({ error: "Nomor pembayaran tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ownedPayment, error } = await admin
    .from("payments")
    .select("order_id")
    .eq("order_id", orderId)
    .eq("user_id", String(claims.sub))
    .maybeSingle();
  if (error) {
    console.error("Payment ownership check failed", error.code);
    return NextResponse.json({ error: "Pembayaran belum dapat diperiksa." }, { status: 503 });
  }
  if (!ownedPayment) {
    return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
  }

  try {
    const result = await synchronizePayment(orderId);
    if (!result || result.userId !== String(claims.sub)) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json(
      { status: result.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (syncError) {
    console.error("Payment status sync failed", syncError);
    return NextResponse.json({ error: "Status pembayaran belum dapat diperbarui." }, { status: 502 });
  }
}
