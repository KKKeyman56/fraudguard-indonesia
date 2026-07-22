import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAccountStatus, getVerifiedClaims } from "@/lib/auth";
import { createSnapTransaction, MIDTRANS_PLANS, purchasablePlanSchema } from "@/lib/midtrans";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string) {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (!entry || entry.resetAt <= now) {
    attempts.set(userId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

function trustedAppUrl(request: NextRequest) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const claims = await getVerifiedClaims();
  if (!claims?.sub || !claims.email) {
    return NextResponse.json({ error: "Silakan masuk untuk memilih paket." }, { status: 401 });
  }
  const userId = String(claims.sub);
  if ((await getAccountStatus(userId)) !== "active") {
    return NextResponse.json({ error: "Akun Anda sedang dinonaktifkan." }, { status: 403 });
  }
  if (isRateLimited(userId)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan pembayaran. Coba lagi satu menit lagi." }, { status: 429 });
  }

  const origin = request.headers.get("origin");
  const appUrl = trustedAppUrl(request);
  if (origin && origin !== appUrl) {
    return NextResponse.json({ error: "Permintaan pembayaran tidak valid." }, { status: 403 });
  }

  const input = purchasablePlanSchema.safeParse((await request.json().catch(() => null) as { plan?: unknown } | null)?.plan);
  if (!input.success) {
    return NextResponse.json({ error: "Paket yang dipilih tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .single();
  if (profileError) {
    console.error("Checkout profile read failed", profileError.code);
    return NextResponse.json({ error: "Data paket belum dapat diperiksa." }, { status: 503 });
  }

  const hasActivePaidPlan = profile.plan !== "free" &&
    (!profile.plan_expires_at || new Date(profile.plan_expires_at).getTime() > Date.now());
  if (hasActivePaidPlan && profile.plan === input.data) {
    return NextResponse.json({ error: "Paket tersebut masih aktif di akun Anda." }, { status: 409 });
  }
  if (hasActivePaidPlan && profile.plan === "enterprise" && input.data === "pro") {
    return NextResponse.json({ error: "Paket Max yang aktif tidak dapat diturunkan ke Pro." }, { status: 409 });
  }

  const orderId = `FG-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const amount = MIDTRANS_PLANS[input.data].amount;
  const { error: insertError } = await admin.from("payments").insert({
    order_id: orderId,
    user_id: userId,
    plan: input.data,
    amount,
    status: "created",
  });
  if (insertError) {
    console.error("Payment insert failed", insertError.code);
    return NextResponse.json({ error: "Pembayaran belum dapat dibuat." }, { status: 503 });
  }

  try {
    const snap = await createSnapTransaction({
      orderId,
      plan: input.data,
      email: String(claims.email),
      finishUrl: `${appUrl}/billing?payment=return`,
    });
    await admin.from("payments").update({ status: "pending", updated_at: new Date().toISOString() }).eq("order_id", orderId);
    return NextResponse.json(
      { redirectUrl: snap.redirect_url, orderId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Snap checkout failed", error);
    await admin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("order_id", orderId);
    return NextResponse.json({ error: "Midtrans Sandbox sedang tidak dapat dihubungi." }, { status: 502 });
  }
}
