import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, Bot, CalendarDays, Database, ShieldAlert, UserCog } from "lucide-react";
import { ManageUserControls } from "@/components/ManageUserControls";
import { getAdminUserDetail, isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Detail Pengguna" };

function formatDate(value: string | null) {
  if (!value) return "Belum ada";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function riskLabel(score: number) {
  if (score >= 70) return "TERDETEKSI";
  if (score >= 40) return "WASPADA";
  return "AMAN";
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const claims = await requireUser("/admin/users");
  const currentUserId = String(claims.sub);
  if (!(await isUserAdmin(currentUserId))) notFound();
  const { id } = await params;
  const data = await getAdminUserDetail(id);
  if (!data) notFound();
  const { user } = data;

  return <main className="app-page grid-bg admin-page admin-user-detail">
    <Link className="text-link back-link" href="/admin/users"><ArrowLeft size={16} /> Kembali ke semua pengguna</Link>
    <section className="neon-card user-profile-hero">
      <div className="user-profile-main"><span className="admin-avatar large">{user.email.slice(0, 1).toUpperCase()}</span><div><span className="eyebrow">ACCOUNT PROFILE // {user.id.slice(0, 8)}</span><h1>{user.email}</h1><div className="account-badges"><span className={`account-status ${user.status}`}>{user.status === "active" ? "AKTIF" : "NONAKTIF"}</span><span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span></div></div></div>
      <ManageUserControls targetId={user.id} currentUserId={currentUserId} role={user.role} status={user.status} />
    </section>

    <section className="admin-stat-grid user-detail-stats" aria-label="Statistik pengguna">
      <article className="neon-card admin-stat"><Bot size={21} /><span>Total analisis</span><strong>{user.analysisCount}</strong><small>Sesi tersimpan</small></article>
      <article className="neon-card admin-stat"><Database size={21} /><span>Total transaksi</span><strong>{user.transactionCount}</strong><small>Baris diperiksa</small></article>
      <article className="neon-card admin-stat"><ShieldAlert size={21} /><span>Terdeteksi</span><strong>{user.detectedCount}</strong><small>Perlu perhatian</small></article>
      <article className="neon-card admin-stat"><CalendarDays size={21} /><span>Bergabung</span><strong className="date-value">{formatDate(user.createdAt).split(" pukul")[0]}</strong><small>{user.status === "suspended" ? `Dinonaktifkan ${formatDate(user.suspendedAt)} WIB` : "Akun aktif"}</small></article>
    </section>

    <section className="admin-grid">
      <article className="neon-card admin-risk-card"><div className="admin-section-title"><div><span className="eyebrow">RISK PROFILE</span><h2>Distribusi transaksi</h2></div><Activity size={27} /></div><div className="risk-count-grid"><div><span>AMAN</span><strong>{data.risk.safe}</strong></div><div><span>WASPADA</span><strong>{data.risk.warning}</strong></div><div><span>TERDETEKSI</span><strong>{data.risk.detected}</strong></div></div></article>
      <article className="neon-card admin-users-card"><div className="admin-section-title"><div><span className="eyebrow">ACCOUNT INFO</span><h2>Informasi akses</h2></div><UserCog size={27} /></div><dl className="account-info"><div><dt>ID akun</dt><dd>{user.id}</dd></div><div><dt>Role</dt><dd>{user.role === "admin" ? "Administrator" : "Pengguna"}</dd></div><div><dt>Status</dt><dd>{user.status === "active" ? "Aktif" : "Dinonaktifkan"}</dd></div><div><dt>Analisis terakhir</dt><dd>{formatDate(user.lastAnalysisAt)} WIB</dd></div></dl></article>
    </section>

    <section className="neon-card admin-activity-card"><div className="admin-section-title"><div><span className="eyebrow">USER ACTIVITY</span><h2>Analisis terbaru</h2></div><span className="admin-table-note">10 aktivitas terbaru</span></div>{data.recentRuns.length === 0 ? <div className="empty-state">Pengguna belum pernah menjalankan analisis.</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>Waktu</th><th>Sumber</th><th>Model</th><th>Risiko</th><th>Status</th></tr></thead><tbody>{data.recentRuns.map((run) => { const label = riskLabel(run.overallRisk); return <tr key={run.id}><td>{formatDate(run.createdAt)} WIB</td><td>{run.source === "manual" ? "Input manual" : "Upload file"}</td><td>{run.model}</td><td>{run.overallRisk}/100</td><td><span className={`status ${label.toLowerCase()}`}>{label}</span></td></tr>; })}</tbody></table></div>}</section>
  </main>;
}
