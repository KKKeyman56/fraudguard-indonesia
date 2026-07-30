import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, GitCompareArrows, RotateCcw, ShieldCheck } from "lucide-react";
import { activateRiskEngineAction } from "@/app/admin/model/actions";
import { isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";
import { getRiskEngineRegistry } from "@/lib/engine-registry";

export const metadata: Metadata = { title: "Kontrol Risk Engine" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function AdminModelPage() {
  const claims = await requireUser("/admin/model");
  if (!(await isUserAdmin(String(claims.sub)))) notFound();
  const registry = await getRiskEngineRegistry();

  return (
    <main className="app-page grid-bg engine-admin-page">
      <Link className="text-link back-link" href="/admin"><ArrowLeft size={15} /> Dashboard admin</Link>
      <div className="page-intro review-intro">
        <div>
          <span className="eyebrow">MODEL GOVERNANCE // VERSIONED</span>
          <h1>Kontrol Risk Engine</h1>
          <p>Aktivasi versi, rollback aman, dan audit setiap perubahan mesin risiko.</p>
        </div>
        <span className="admin-verified"><ShieldCheck size={16} /> ADMIN ONLY</span>
      </div>

      <section className="engine-version-grid">
        {registry.versions.map((item) => {
          const active = item.version === registry.activeVersion;
          return (
            <article className={`neon-card engine-version-card ${active ? "active" : ""}`} key={item.version}>
              <div className="engine-version-head">
                <div><span className="eyebrow">{item.version}</span><h2>{item.displayName}</h2></div>
                {active && <span className="ml-ready"><CheckCircle2 size={15} /> AKTIF</span>}
              </div>
              <p>{item.algorithm}</p>
              <small>{item.releaseNotes}</small>
              {!active && (
                <form action={activateRiskEngineAction}>
                  <input type="hidden" name="version" value={item.version} />
                  <label>
                    Alasan perubahan
                    <input name="reason" minLength={8} maxLength={240} required defaultValue={item.version === "rules-v1.1.0" ? "Rollback operasional ke versi stabil P1" : "Aktivasi kembali engine hybrid statistik P2"} />
                  </label>
                  <button className="button button-small" type="submit">
                    {item.version === "rules-v1.1.0" ? <RotateCcw size={15} /> : <GitCompareArrows size={15} />}
                    {item.version === "rules-v1.1.0" ? "Rollback ke versi ini" : "Aktifkan versi ini"}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </section>

      <section className="neon-card deployment-log">
        <div className="admin-section-title"><div><span className="eyebrow">DEPLOYMENT AUDIT</span><h2>Riwayat aktivasi</h2></div><span>{registry.deployments.length} perubahan terbaru</span></div>
        {registry.deployments.length === 0 ? <div className="empty-state">Belum ada rollback atau perubahan versi manual.</div> : (
          <ol>
            {registry.deployments.map((item) => (
              <li key={item.id}>
                <time>{formatDate(item.created_at)} WIB</time>
                <strong>{item.previous_version || "awal"} → {item.new_version}</strong>
                <span>{item.reason}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
