"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PauseCircle, PlayCircle, Save } from "lucide-react";
import { manageUserAction, type ManageUserState } from "@/app/admin/users/actions";
import type { AccountStatus, UserRole } from "@/lib/admin-repository";
import type { SubscriptionPlan } from "@/lib/plans";

type ManageUserControlsProps = {
  targetId: string;
  currentUserId: string;
  role: UserRole;
  status: AccountStatus;
  plan: SubscriptionPlan;
  compact?: boolean;
};

const initialState: ManageUserState = { ok: false, message: "" };

function SubmitButton({ label, icon }: { label: string; icon: "save" | "pause" | "play" }) {
  const { pending } = useFormStatus();
  const Icon = icon === "save" ? Save : icon === "pause" ? PauseCircle : PlayCircle;
  return <button className="button button-small" type="submit" disabled={pending}><Icon size={14} />{pending ? "Memproses..." : label}</button>;
}

export function ManageUserControls({ targetId, currentUserId, role, status, plan, compact = false }: ManageUserControlsProps) {
  const [roleState, roleAction] = useActionState(manageUserAction, initialState);
  const [statusState, statusAction] = useActionState(manageUserAction, initialState);
  const [planState, planAction] = useActionState(manageUserAction, initialState);
  const isSelf = targetId === currentUserId;

  if (isSelf) return <span className="admin-self-lock">Akun Anda · terkunci</span>;

  return <div className={`user-controls${compact ? " compact" : ""}`}>
    <form action={planAction} className="role-form">
      <input type="hidden" name="operation" value="plan" />
      <input type="hidden" name="targetId" value={targetId} />
      <label><span className="sr-only">Paket pengguna</span><select name="plan" defaultValue={plan} aria-label="Paket pengguna"><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></label>
      <SubmitButton label="Simpan paket" icon="save" />
    </form>
    <form
      action={roleAction}
      className="role-form"
      onSubmit={(event) => {
        const nextRole = String(new FormData(event.currentTarget).get("role"));
        if (nextRole !== role && !window.confirm(`Ubah role akun ini menjadi ${nextRole.toUpperCase()}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="operation" value="role" />
      <input type="hidden" name="targetId" value={targetId} />
      <label>
        <span className="sr-only">Role pengguna</span>
        <select name="role" defaultValue={role} aria-label="Role pengguna">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <SubmitButton label="Simpan role" icon="save" />
    </form>
    <form
      action={statusAction}
      onSubmit={(event) => {
        if (status === "active" && !window.confirm("Nonaktifkan akun ini? Pengguna tidak dapat mengakses analisis dan datanya sampai diaktifkan kembali.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="operation" value="status" />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="status" value={status === "active" ? "suspended" : "active"} />
      <SubmitButton label={status === "active" ? "Nonaktifkan" : "Aktifkan"} icon={status === "active" ? "pause" : "play"} />
    </form>
    {roleState.message && <p className={roleState.ok ? "action-success" : "action-error"} role="status">{roleState.message}</p>}
    {statusState.message && <p className={statusState.ok ? "action-success" : "action-error"} role="status">{statusState.message}</p>}
    {planState.message && <p className={planState.ok ? "action-success" : "action-error"} role="status">{planState.message}</p>}
  </div>;
}
