create table if not exists public.risk_engine_versions (
  version text primary key,
  display_name text not null,
  algorithm text not null,
  release_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.risk_engine_settings (
  singleton boolean primary key default true check (singleton),
  active_version text not null references public.risk_engine_versions(version),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.risk_engine_deployments (
  id bigint generated always as identity primary key,
  previous_version text references public.risk_engine_versions(version),
  new_version text not null references public.risk_engine_versions(version),
  actor_id uuid references auth.users(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.risk_engine_versions enable row level security;
alter table public.risk_engine_settings enable row level security;
alter table public.risk_engine_deployments enable row level security;

insert into public.risk_engine_versions (version, display_name, algorithm, release_notes)
values
  (
    'rules-v1.1.0',
    'Deterministic Rules V1',
    'Aturan deterministik + business baseline',
    'Versi rollback stabil dari P1 tanpa sinyal statistik robust-z.'
  ),
  (
    'hybrid-v2.0.0',
    'Hybrid Statistical V2',
    'Aturan deterministik + business baseline + robust z-score',
    'Menambah deteksi anomali nominal berbasis median absolute deviation.'
  )
on conflict (version) do update set
  display_name = excluded.display_name,
  algorithm = excluded.algorithm,
  release_notes = excluded.release_notes;

insert into public.risk_engine_settings (singleton, active_version)
values (true, 'hybrid-v2.0.0')
on conflict (singleton) do nothing;

revoke all on table public.risk_engine_versions from public, anon, authenticated;
revoke all on table public.risk_engine_settings from public, anon, authenticated;
revoke all on table public.risk_engine_deployments from public, anon, authenticated;
grant select on table public.risk_engine_versions to authenticated;
grant select on table public.risk_engine_settings to authenticated;
grant select on table public.risk_engine_deployments to authenticated;

drop policy if exists "Pengguna aktif membaca registry engine" on public.risk_engine_versions;
create policy "Pengguna aktif membaca registry engine"
on public.risk_engine_versions for select to authenticated
using ((select private.is_fraudguard_active_user()));

drop policy if exists "Pengguna aktif membaca engine aktif" on public.risk_engine_settings;
create policy "Pengguna aktif membaca engine aktif"
on public.risk_engine_settings for select to authenticated
using ((select private.is_fraudguard_active_user()));

drop policy if exists "Admin membaca deployment engine" on public.risk_engine_deployments;
create policy "Admin membaca deployment engine"
on public.risk_engine_deployments for select to authenticated
using ((select private.is_fraudguard_admin()));

create index if not exists risk_engine_deployments_created_idx
  on public.risk_engine_deployments (created_at desc);

comment on table public.risk_engine_versions is
  'Registry versi Risk Engine yang dapat dipilih dan di-rollback.';
comment on table public.risk_engine_deployments is
  'Audit append-only setiap aktivasi atau rollback Risk Engine.';
