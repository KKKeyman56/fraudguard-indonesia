drop policy if exists "Pengguna membaca profil sendiri" on public.profiles;
drop policy if exists "Admin membaca semua profil" on public.profiles;
create policy "Pengguna atau admin membaca profil" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.is_fraudguard_admin()));

drop policy if exists "Pengguna membaca analisis sendiri" on public.analysis_runs;
drop policy if exists "Admin membaca semua analisis" on public.analysis_runs;
create policy "Pengguna atau admin membaca analisis" on public.analysis_runs
for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_fraudguard_admin()));

drop policy if exists "Pengguna membaca transaksi sendiri" on public.transactions;
drop policy if exists "Admin membaca semua transaksi" on public.transactions;
create policy "Pengguna atau admin membaca transaksi" on public.transactions
for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_fraudguard_admin()));
