create index if not exists risk_engine_deployments_actor_idx
  on public.risk_engine_deployments (actor_id);
create index if not exists risk_engine_deployments_new_version_idx
  on public.risk_engine_deployments (new_version);
create index if not exists risk_engine_deployments_previous_version_idx
  on public.risk_engine_deployments (previous_version);
create index if not exists risk_engine_settings_active_version_idx
  on public.risk_engine_settings (active_version);
create index if not exists risk_engine_settings_updated_by_idx
  on public.risk_engine_settings (updated_by);
