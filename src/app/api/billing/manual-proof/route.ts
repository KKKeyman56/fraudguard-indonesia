import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAccountStatus, getVerifiedClaims } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["application/pdf", "pdf"],
]);

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "application/pdf") return [0x25, 0x50, 0x44, 0x46, 0x2d].every((value, index) => bytes[index] === value);
  return false;
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    return originUrl.host === (forwardedHost || request.headers.get("host") || request.nextUrl.host);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await getVerifiedClaims();
    if (!claims?.sub) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
    const userId = String(claims.sub);
    if ((await getAccountStatus(userId)) !== "active") {
      return NextResponse.json({ error: "Akun Anda sedang dinonaktifkan." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Permintaan unggah tidak valid." }, { status: 403 });
    }

    const formData = await request.formData();
    const orderId = formData.get("orderId");
    const proof = formData.get("proof");
    if (typeof orderId !== "string" || orderId.length > 80 || !(proof instanceof File)) {
      return NextResponse.json({ error: "Data bukti transfer tidak valid." }, { status: 400 });
    }
    const extension = allowedTypes.get(proof.type);
    if (!extension) return NextResponse.json({ error: "Gunakan file JPG, PNG, atau PDF." }, { status: 415 });
    if (proof.size <= 0 || proof.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran bukti transfer maksimal 5 MB." }, { status: 413 });
    }

    const admin = createAdminClient();
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id, user_id, provider, status, manual_review_status, proof_path, checkout_expires_at")
      .eq("order_id", orderId)
      .maybeSingle();
    if (paymentError) throw new Error(`PAYMENT_READ_FAILED:${paymentError.code}`);
    if (!payment || payment.user_id !== userId) {
      return NextResponse.json({ error: "Pesanan pembayaran tidak ditemukan." }, { status: 404 });
    }
    if (payment.provider !== "manual_bank" || payment.status !== "pending" ||
        !["awaiting_proof", "pending_review"].includes(payment.manual_review_status)) {
      return NextResponse.json({ error: "Pesanan ini tidak menerima bukti pembayaran baru." }, { status: 409 });
    }
    if (!payment.checkout_expires_at || new Date(payment.checkout_expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Batas waktu pembayaran telah berakhir. Buat pesanan baru dari halaman paket." }, { status: 410 });
    }

    const path = `${userId}/${payment.id}/${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await proof.arrayBuffer());
    if (!hasExpectedSignature(proof.type, bytes)) {
      return NextResponse.json({ error: "Isi file tidak sesuai dengan format yang dipilih." }, { status: 415 });
    }
    const { error: uploadError } = await admin.storage.from("payment-proofs").upload(path, bytes, {
      contentType: proof.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      console.error("Manual payment proof upload failed", uploadError.message);
      return NextResponse.json({ error: "Penyimpanan bukti belum siap. Coba lagi setelah migrasi database diterapkan." }, { status: 503 });
    }

    const { error: updateError } = await admin.from("payments").update({
      proof_path: path,
      proof_original_name: proof.name.slice(0, 180),
      proof_submitted_at: new Date().toISOString(),
      manual_review_status: "pending_review",
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id).eq("user_id", userId);
    if (updateError) {
      await admin.storage.from("payment-proofs").remove([path]);
      throw new Error(`PAYMENT_PROOF_SAVE_FAILED:${updateError.code}`);
    }

    if (payment.proof_path && payment.proof_path !== path) {
      await admin.storage.from("payment-proofs").remove([payment.proof_path]);
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Manual payment proof request failed", error);
    return NextResponse.json({ error: "Bukti transfer belum dapat diproses." }, { status: 500 });
  }
}
