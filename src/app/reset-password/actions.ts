"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error?: string };

const passwordSchema = z.object({
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72),
  confirmation: z.string().min(1, "Ulangi kata sandi baru Anda."),
}).refine((value) => value.password === value.confirmation, {
  message: "Konfirmasi kata sandi tidak cocok.",
  path: ["confirmation"],
});

export async function updateRecoveredPassword(
  _: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const cookieStore = await cookies();
  if (cookieStore.get("fraudguard_password_recovery")?.value !== "active") {
    return { error: "Sesi pemulihan tidak valid. Minta tautan baru." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) {
    return { error: "Tautan pemulihan sudah kedaluwarsa. Minta tautan baru." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("same password")) return { error: "Gunakan kata sandi yang berbeda dari sebelumnya." };
    if (message.includes("weak") || message.includes("password")) return { error: "Kata sandi ditolak. Gunakan kombinasi yang lebih kuat." };
    console.error("Recovered password update failed", error.code);
    return { error: "Kata sandi belum dapat diperbarui. Silakan coba lagi." };
  }

  await supabase.auth.signOut();
  cookieStore.delete("fraudguard_password_recovery");
  redirect("/login?password_reset=success");
}
