import { CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DATA_PROCESSING_CONSENT_VERSION, LEGAL_VERSION } from "@/lib/legal-versions";
import { acceptCurrentLegalTerms, deleteMyAccount } from "./actions";

export const metadata = { title: "Pengaturan Akun | FraudGuard" };

type SearchParams = Promise<{ error?: string; updated?: string }>;

const errors: Record<string, string> = {
  consent: "Persetujuan belum dapat disimpan. Coba lagi.",
  confirmation: "Ketik HAPUS AKUN persis untuk mengonfirmasi.",
  deletion: "Akun belum dapat dihapus. Coba lagi atau hubungi pengelola FraudGuard.",
};

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const claims = await requireUser("/settings");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: consent } = await supabase
    .from("legal_consents")
    .select("consented_at")
    .eq("user_id", String(claims.sub))
    .eq("legal_version", LEGAL_VERSION)
    .eq("screening_consent_version", DATA_PROCESSING_CONSENT_VERSION)
    .maybeSingle();

  return (
    <main className="app-page grid-bg settings-page">
      <div className="page-intro">
        <span className="eyebrow">ACCOUNT CONTROL</span>
        <h1>Pengaturan akun</h1>
        <p>Kelola persetujuan paid beta dan hak penghapusan data Anda.</p>
      </div>
      {params.error && <div className="alert" role="alert">{errors[params.error] || "Permintaan belum berhasil."}</div>}
      {params.updated && <div className="settings-success" role="status"><CheckCircle2 size={18} /> Persetujuan versi terbaru telah tersimpan.</div>}

      <section className="neon-card settings-card">
        <ShieldCheck size={30} />
        <div>
          <span className="eyebrow">LEGAL CONSENT</span>
          <h2>Persetujuan paid beta</h2>
          <p>Versi dokumen: {LEGAL_VERSION}. Versi persetujuan skrining: {DATA_PROCESSING_CONSENT_VERSION}.</p>
          {consent ? (
            <p className="consent-current"><CheckCircle2 size={17} /> Aktif sejak {new Date(consent.consented_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>
          ) : (
            <form action={acceptCurrentLegalTerms}>
              <p>Dengan menyimpan, Anda menyetujui <a href="/terms">Syarat & Ketentuan</a>, <a href="/privacy">Kebijakan Privasi</a>, dan penggunaan FraudGuard sebagai alat skrining risiko—bukan bukti fraud.</p>
              <button className="button" type="submit">Setujui versi terbaru</button>
            </form>
          )}
        </div>
      </section>

      <section className="neon-card settings-card danger-zone">
        <Trash2 size={30} />
        <div>
          <span className="eyebrow">DANGER ZONE</span>
          <h2>Hapus akun dan data</h2>
          <p>Tindakan ini permanen. Akun, analisis, transaksi, review, dan data terkait akan dihapus atau dianonimkan sesuai kewajiban hukum dan catatan pembayaran yang wajib disimpan.</p>
          <form action={deleteMyAccount}>
            <label>Ketik <strong>HAPUS AKUN</strong> untuk konfirmasi
              <input name="confirmation" autoComplete="off" required />
            </label>
            <button className="button danger-button" type="submit">Hapus akun permanen</button>
          </form>
        </div>
      </section>
    </main>
  );
}
