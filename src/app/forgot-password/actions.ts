"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error?: string; success?: string };

const emailSchema = z.string().trim().email("Masukkan alamat email yang valid.");

function recoveryOrigin(requestHeaders: Awaited<ReturnType<typeof headers>>) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    const normalized = configured.startsWith("//")
      ? `https:${configured}`
      : /^https?:\/\//i.test(configured)
        ? configured
        : `https://${configured}`;
    try {
      return new URL(normalized).origin;
    } catch {
      console.error("APP_URL is invalid while creating a password recovery link.");
    }
  }

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}` : "https://www.fraudguard.biz.id";
}

export async function requestPasswordReset(
  _: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const requestHeaders = await headers();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${recoveryOrigin(requestHeaders)}/auth/recovery`,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate limit")) {
      return { error: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi." };
    }
    console.error("Password reset email failed", error.code);
    return { error: "Email pemulihan belum dapat dikirim. Silakan coba lagi." };
  }

  return {
    success: "Jika email terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Periksa juga folder spam.",
  };
}
