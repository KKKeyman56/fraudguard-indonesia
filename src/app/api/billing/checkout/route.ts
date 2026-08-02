import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountStatus, getVerifiedClaims } from "@/lib/auth";
import { LEGAL_VERSION } from "@/lib/legal-versions";
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

  const input = z.object({
    plan: purchasablePlanSchema,
    acceptTerms: z.literal(true),
  }).safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "Paket atau persetujuan pembayaran tidak valid." }, { status: 400 });
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
  if (hasActivePaidPlan && profile.plan === input.data.plan) {
    return NextResponse.json({ error: "Paket tersebut masih aktif di akun Anda." }, { status: 409 });
  }
  if (hasActivePaidPlan && profile.plan === "enterprise" && input.data.plan === "pro") {
    return NextResponse.json({ error: "Paket Max yang aktif tidak dapat diturunkan ke Pro." }, { status: 409 });
  }

  const { data: reusablePayment, error: reusableError } = await admin
    .from("payments")
    .select("order_id, checkout_url, checkout_expires_at")
    .eq("user_id", userId)
    .eq("plan", input.data.plan)
    .eq("status", "pending")
    .gt("checkout_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reusableError) {
    console.error("Pending checkout read failed", reusableError.code);
  } else if (reusablePayment?.checkout_url) {
    return NextResponse.json(
      { redirectUrl: reusablePayment.checkout_url, orderId: reusablePayment.order_id },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const orderId = `FG-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const amount = MIDTRANS_PLANS[input.data.plan].amount;
  const { error: insertError } = await admin.from("payments").insert({
    order_id: orderId,
    user_id: userId,
    plan: input.data.plan,
    amount,
    status: "created",
    terms_version: LEGAL_VERSION,
    terms_accepted_at: new Date().toISOString(),
  });
  if (insertError) {
    console.error("Payment insert failed", insertError.code);
    return NextResponse.json({ error: "Pembayaran belum dapat dibuat." }, { status: 503 });
  }

  try {
    const snap = await createSnapTransaction({
      orderId,
      plan: input.data.plan,
      email: String(claims.email),
      finishUrl: `${appUrl}/billing?payment=return&orderId=${encodeURIComponent(orderId)}`,
    });
    const checkoutExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: updateError } = await admin.from("payments").update({
      status: "pending",
      checkout_url: snap.redirect_url,
      checkout_expires_at: checkoutExpiresAt,
      updated_at: new Date().toISOString(),
    }).eq("order_id", orderId);
    if (updateError) throw new Error(`PAYMENT_CHECKOUT_SAVE_FAILED:${updateError.code}`);
    return NextResponse.json(
      { redirectUrl: snap.redirect_url, orderId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Snap checkout failed", error);
    await admin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("order_id", orderId);
    return NextResponse.json({ error: "Midtrans sedang tidak dapat dihubungi." }, { status: 502 });
  }
}
