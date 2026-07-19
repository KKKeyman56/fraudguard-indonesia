"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

const credentialsSchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72),
  next: z.string().optional(),
});

function safeNext(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email atau kata sandi tidak cocok.";
  if (normalized.includes("email not confirmed")) return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
  if (normalized.includes("user already registered")) return "Email ini sudah terdaftar. Silakan masuk.";
  if (normalized.includes("rate limit")) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  return "Permintaan belum berhasil. Silakan coba lagi.";
}

function readCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Data login tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: friendlyAuthError(error.message) };
  redirect(safeNext(parsed.data.next));
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Data pendaftaran tidak valid." };

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "https://fraudguard-indonesia.vercel.app";
  const next = safeNext(parsed.data.next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) return { error: friendlyAuthError(error.message) };
  if (data.session) redirect(next);
  return { success: "Akun berhasil dibuat. Periksa email Anda untuk mengaktifkan akun." };
}
