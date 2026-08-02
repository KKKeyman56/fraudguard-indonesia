drop policy if exists "Service role manages payment events" on public.payment_events;
create policy "Service role manages payment events"
  on public.payment_events for all
  to service_role
  using (true)
  with check (true);
