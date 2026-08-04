"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Mail, Save } from "lucide-react";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/forgot-password/actions";
import { updateRecoveredPassword, type ResetPasswordState } from "@/app/reset-password/actions";

function RecoveryButton({ mode }: { mode: "request" | "update" }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? "Memproses..." : mode === "request" ? "Kirim tautan pemulihan" : "Simpan kata sandi baru"}
      {!pending && (mode === "request" ? <Mail size={17} /> : <Save size={17} />)}
    </button>
  );
}

export function PasswordRecoveryForm({ mode }: { mode: "request" | "update" }) {
  const [requestState, requestAction] = useActionState<ForgotPasswordState, FormData>(requestPasswordReset, {});
  const [updateState, updateAction] = useActionState<ResetPasswordState, FormData>(updateRecoveredPassword, {});
  const error = mode === "request" ? requestState.error : updateState.error;
  const success = mode === "request" ? requestState.success : undefined;

  return (
    <div className="auth-form-wrap">
      <div className="auth-lock"><KeyRound size={20} /> PASSWORD RECOVERY</div>
      {error && <p className="auth-message error" role="alert">{error}</p>}
      {success && <p className="auth-message success" role="status">{success}</p>}
      <form action={mode === "request" ? requestAction : updateAction} className="auth-form">
        {mode === "request" ? (
          <label>Email akun<input name="email" type="email" autoComplete="email" placeholder="nama@tokomu.id" required /></label>
        ) : (
          <>
            <label>Kata sandi baru<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="Minimal 8 karakter" required /></label>
            <label>Ulangi kata sandi<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="Ketik ulang kata sandi" required /></label>
          </>
        )}
        <RecoveryButton mode={mode} />
      </form>
      <a className="text-link auth-back-link" href="/login">Kembali ke halaman masuk</a>
    </div>
  );
}
