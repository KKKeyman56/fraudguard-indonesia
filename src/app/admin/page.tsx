import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowRight, Bot, Database, ShieldCheck, Users } from "lucide-react";
import { getAdminDashboardData, isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard Admin" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function riskLabel(score: number) {
  if (score >= 70) return "TERDETEKSI";
  if (score >= 40) return "WASPADA";
  return "AMAN";
}

export default async function AdminPage() {
  const claims = await requireUser("/admin");
  if (!(await isUserAdmin(String(claims.sub)))) notFound();
  const data = await getAdminDashboardData();
  const riskTotal = data.risk.safe + data.risk.warning + data.risk.detected;
  const percent = (value: number) => riskTotal === 0 ? 0 : Math.round((value / riskTotal) * 100);
  const stats = [
    { label: "Total pengguna", value: data.totals.users, note: `+${data.totals.newUsers} dalam 7 hari`, icon: Users },
    { label: "Total analisis", value: data.totals.analyses, note: "Sesi AI tersimpan", icon: Bot },
    { label: "Total transaksi", value: data.totals.transactions, note: "Baris telah diperiksa", icon: Database },
    { label: "Terdeteksi", value: data.risk.detected, note: `${percent(data.risk.detected)}% dari transaksi`, icon: ShieldCheck },
  ];

  return <main className="app-page grid-bg admin-page">
    <div className="page-intro admin-intro"><div><span className="eyebrow">ADMIN COMMAND CENTER // RESTRICTED</span><h1>Dashboard admin</h1><p>Pantau pertumbuhan pengguna, aktivitas analisis, dan distribusi risiko FraudGuard.</p></div><span className="admin-verified"><ShieldCheck size={16} /> ADMIN TERVERIFIKASI</span></div>
    <section className="admin-stat-grid" aria-label="Statistik utama">{stats.map((stat) => { const Icon = stat.icon; return <article className="neon-card admin-stat" key={stat.label}><Icon size={21} /><span>{stat.label}</span><strong>{stat.value.toLocaleString("id-ID")}</strong><small>{stat.note}</small></article>; })}</section>
    <section className="admin-grid">
      <article className="neon-card admin-risk-card"><div className="admin-section-title"><div><span className="eyebrow">RISK DISTRIBUTION</span><h2>Status seluruh transaksi</h2></div><Activity size={27} /></div><div className="risk-bars"><div><p><span>AMAN</span><strong>{data.risk.safe} · {percent(data.risk.safe)}%</strong></p><i><b className="safe" style={{ width: `${percent(data.risk.safe)}%` }} /></i></div><div><p><span>WASPADA</span><strong>{data.risk.warning} · {percent(data.risk.warning)}%</strong></p><i><b className="warning" style={{ width: `${percent(data.risk.warning)}%` }} /></i></div><div><p><span>TERDETEKSI</span><strong>{data.risk.detected} · {percent(data.risk.detected)}%</strong></p><i><b className="danger" style={{ width: `${percent(data.risk.detected)}%` }} /></i></div></div><p className="admin-note">Statistik adalah alat pemantauan. Keputusan final terhadap transaksi tetap memerlukan verifikasi manusia.</p></article>
      <article className="neon-card admin-users-card"><div className="admin-section-title"><div><span className="eyebrow">NEW ACCOUNTS</span><h2>Pengguna terbaru</h2></div><Users size={27} /></div><div className="admin-user-list">{data.recentUsers.map((user) => <div key={user.id}><span className="admin-avatar">{user.email.slice(0, 1).toUpperCase()}</span><p><strong>{user.email}</strong><small>Bergabung {formatDate(user.createdAt)} WIB</small></p><em className={user.role}>{user.role === "admin" ? "ADMIN" : "USER"}</em></div>)}</div></article>
    </section>
    <section className="neon-card admin-activity-card"><div className="admin-section-title"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Analisis terbaru</h2></div><span className="admin-table-note">8 aktivitas terbaru</span></div>{data.recentRuns.length === 0 ? <div className="empty-state">Belum ada aktivitas analisis.</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Sumber</th><th>Model AI</th><th>Risiko</th><th>Laporan</th></tr></thead><tbody>{data.recentRuns.map((run) => { const label = riskLabel(run.overallRisk); return <tr key={run.id}><td>{formatDate(run.createdAt)} WIB</td><td>{run.email}</td><td>{run.source === "manual" ? "Input manual" : "Upload file"}</td><td>{run.model}</td><td><span className={`status ${label.toLowerCase()}`}>{run.overallRisk}/100 · {label}</span></td><td><Link className="text-link" href={`/report?id=${run.id}`}>Lihat <ArrowRight size={14} /></Link></td></tr>; })}</tbody></table></div>}</section>
  </main>;
}
