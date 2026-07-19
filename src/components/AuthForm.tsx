"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { login, signup, type AuthState } from "@/app/login/actions";

const initialState: AuthState = {};

function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();
  const isLogin = mode === "login";
  return (
    <button className={isLogin ? "button" : "button button-ghost"} disabled={pending} type="submit">
      {pending ? "Memproses..." : isLogin ? "Masuk ke FraudGuard" : "Buat akun gratis"}
      {!pending && (isLogin ? <LogIn size={17} /> : <UserPlus size={17} />)}
    </button>
  );
}

function Fields({ next, mode }: { next: string; mode: "login" | "signup" }) {
  return (
    <>
      <input type="hidden" name="next" value={next} />
      <label>Email bisnis<input name="email" type="email" autoComplete="email" placeholder="nama@tokomu.id" required /></label>
      <label>Kata sandi<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={72} placeholder="Minimal 8 karakter" required /></label>
    </>
  );
}

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction] = useActionState(login, initialState);
  const [signupState, signupAction] = useActionState(signup, initialState);
  const state = mode === "login" ? loginState : signupState;

  return (
    <div className="auth-form-wrap">
      <div className="auth-lock"><LockKeyhole size={20} /> SESSION TERVERIFIKASI</div>
      <div className="auth-tabs" role="tablist" aria-label="Pilih akses akun">
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Masuk</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Daftar baru</button>
      </div>
      {state.error && <p className="auth-message error" role="alert">{state.error}</p>}
      {state.success && <p className="auth-message success" role="status">{state.success}</p>}
      <form key={mode} action={mode === "login" ? loginAction : signupAction} className="auth-form">
        <Fields next={next} mode={mode} />
        <SubmitButton mode={mode} />
      </form>
      <p className="auth-note">Dengan melanjutkan, Anda menyetujui penggunaan FraudGuard untuk rekomendasi risiko transaksi. Keputusan final tetap di tangan Anda.</p>
    </div>
  );
}
