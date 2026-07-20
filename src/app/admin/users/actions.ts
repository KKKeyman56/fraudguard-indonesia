"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ManageUserState = { ok: boolean; message: string };

const actionSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("role"), targetId: z.string().uuid(), role: z.enum(["user", "admin"]) }),
  z.object({ operation: z.literal("status"), targetId: z.string().uuid(), status: z.enum(["active", "suspended"]) }),
]);

export async function manageUserAction(
  _previousState: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  const claims = await requireUser("/admin/users");
  const actorId = String(claims.sub);
  if (!(await isUserAdmin(actorId))) return { ok: false, message: "Akses admin tidak valid." };

  const parsed = actionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  if (parsed.data.targetId === actorId) {
    return { ok: false, message: "Role dan status akun Anda sendiri dikunci demi keamanan." };
  }

  const supabase = await createClient();
  const changes = parsed.data.operation === "role"
    ? { role: parsed.data.role }
    : {
        status: parsed.data.status,
        suspended_at: parsed.data.status === "suspended" ? new Date().toISOString() : null,
      };
  const { data, error } = await supabase
    .from("profiles")
    .update(changes)
    .eq("id", parsed.data.targetId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: `Perubahan gagal (${error.code}).` };
  if (!data) return { ok: false, message: "Pengguna tidak ditemukan atau perubahan tidak diizinkan." };

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.targetId}`);
  return {
    ok: true,
    message: parsed.data.operation === "role" ? "Role pengguna diperbarui." : "Status akun diperbarui.",
  };
}
