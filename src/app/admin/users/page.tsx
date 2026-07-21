import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import { ManageUserControls } from "@/components/ManageUserControls";
import { getAdminUsers, isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";
import { PLAN_DETAILS } from "@/lib/plans";

export const metadata: Metadata = { title: "Manajemen Pengguna" };

function formatDate(value: string | null) {
  if (!value) return "Belum ada";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/admin/users?${params.toString()}`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const claims = await requireUser("/admin/users");
  const currentUserId = String(claims.sub);
  if (!(await isUserAdmin(currentUserId))) notFound();
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const data = await getAdminUsers({ query: params.q || "", page: Number.isFinite(requestedPage) ? requestedPage : 1 });
  if (data.page > data.totalPages) redirect(pageHref(data.totalPages, data.query));

  return <main className="app-page grid-bg admin-page admin-users-page">
    <div className="page-intro admin-intro">
      <div><span className="eyebrow">USER MANAGEMENT // RESTRICTED</span><h1>Manajemen pengguna</h1><p>Cari akun, pantau aktivitas, ubah hak akses, dan hentikan akses akun mencurigakan.</p></div>
      <Link className="button button-secondary" href="/admin"><ChevronLeft size={17} /> Dashboard admin</Link>
    </div>

    <section className="neon-card user-management-card">
      <div className="admin-section-title user-management-heading">
        <div><span className="eyebrow">ACCOUNT DIRECTORY</span><h2>Semua pengguna</h2><p>{data.total.toLocaleString("id-ID")} akun terdaftar</p></div>
        <Users size={28} />
      </div>
      <form className="admin-search" method="get" role="search">
        <Search size={18} aria-hidden="true" />
        <input name="q" type="search" defaultValue={data.query} placeholder="Cari berdasarkan email..." aria-label="Cari pengguna berdasarkan email" maxLength={80} />
        <button className="button button-small" type="submit">Cari</button>
        {data.query && <Link className="text-link" href="/admin/users">Reset</Link>}
      </form>

      {data.users.length === 0 ? <div className="empty-state">Tidak ada pengguna yang cocok dengan pencarian.</div> : <div className="table-wrap">
        <table className="admin-table user-table">
          <thead><tr><th>Pengguna</th><th>Status</th><th>Aktivitas</th><th>Terakhir aktif</th><th>Kontrol</th><th>Detail</th></tr></thead>
          <tbody>{data.users.map((user) => <tr key={user.id}>
            <td><div className="user-identity"><span className="admin-avatar">{user.email.slice(0, 1).toUpperCase()}</span><div><strong>{user.email}</strong><small>Bergabung {formatDate(user.createdAt)} WIB</small></div></div></td>
            <td><div className="account-badges"><span className={`account-status ${user.status}`}>{user.status === "active" ? "AKTIF" : "NONAKTIF"}</span><span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span><span className={`plan-badge ${user.plan}`}>{PLAN_DETAILS[user.plan].name.toUpperCase()}</span></div></td>
            <td><strong>{user.analysisCount}</strong> analisis<br /><small>{user.monthlyAnalysisCount} bulan ini · {user.transactionCount} transaksi · {user.detectedCount} terdeteksi</small></td>
            <td>{formatDate(user.lastAnalysisAt)} WIB</td>
            <td><ManageUserControls targetId={user.id} currentUserId={currentUserId} role={user.role} status={user.status} plan={user.plan} compact /></td>
            <td><Link className="icon-link" href={`/admin/users/${user.id}`} aria-label={`Buka detail ${user.email}`}><UserCog size={17} /><ChevronRight size={15} /></Link></td>
          </tr>)}</tbody>
        </table>
      </div>}

      <nav className="history-pagination" aria-label="Navigasi halaman pengguna">
        {data.page > 1 ? <Link className="button button-secondary button-small" href={pageHref(data.page - 1, data.query)}><ChevronLeft size={16} /> Sebelumnya</Link> : <span />}
        <span>Halaman {data.page} dari {data.totalPages}</span>
        {data.page < data.totalPages ? <Link className="button button-secondary button-small" href={pageHref(data.page + 1, data.query)}>Berikutnya <ChevronRight size={16} /></Link> : <span />}
      </nav>
    </section>
    <p className="admin-security-note"><ShieldCheck size={15} /> Akun admin yang sedang digunakan tidak dapat mengubah role atau menonaktifkan dirinya sendiri.</p>
  </main>;
}
