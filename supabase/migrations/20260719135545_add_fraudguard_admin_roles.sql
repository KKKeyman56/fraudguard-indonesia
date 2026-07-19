create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
create index profiles_created_at_idx on public.profiles (created_at desc);
create index profiles_role_idx on public.profiles (role) where role = 'admin';

insert into public.profiles (id, email, role, created_at)
select id, email, 'user', created_at from auth.users
on conflict (id) do update set email = excluded.email;

create or replace function private.handle_fraudguard_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, created_at)
  values (new.id, new.email, 'user', new.created_at)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

revoke all on function private.handle_fraudguard_new_user() from public, anon, authenticated;
create trigger fraudguard_auth_user_created after insert on auth.users
for each row execute function private.handle_fraudguard_new_user();

create or replace function private.is_fraudguard_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_fraudguard_admin() from public, anon, authenticated;
grant execute on function private.is_fraudguard_admin() to authenticated;
create policy "Pengguna membaca profil sendiri" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Admin membaca semua profil" on public.profiles for select to authenticated using ((select private.is_fraudguard_admin()));
create policy "Admin membaca semua analisis" on public.analysis_runs for select to authenticated using ((select private.is_fraudguard_admin()));
create policy "Admin membaca semua transaksi" on public.transactions for select to authenticated using ((select private.is_fraudguard_admin()));
