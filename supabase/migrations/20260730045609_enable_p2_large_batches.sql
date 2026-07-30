create or replace function private.reserve_my_transaction_quota(p_transaction_count integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  effective_plan text;
  monthly_limit integer;
  current_usage integer;
  reservation_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_transaction_count is null or p_transaction_count < 1 or p_transaction_count > 500 then
    raise exception using errcode = '22023', message = 'INVALID_TRANSACTION_COUNT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));
  select case
    when profile.plan in ('pro', 'enterprise')
      and profile.plan_expires_at is not null
      and profile.plan_expires_at <= now() then 'free'
    else profile.plan
  end
  into effective_plan
  from public.profiles as profile
  where profile.id = actor_id and profile.status = 'active';
  if effective_plan is null then
    raise exception using errcode = '42501', message = 'ACCOUNT_NOT_ACTIVE';
  end if;
  if effective_plan = 'free' and p_transaction_count > 50 then
    raise exception using errcode = 'P0001', message = 'FREE_BATCH_LIMIT_EXCEEDED';
  end if;
  monthly_limit := case effective_plan
    when 'free' then 50 when 'pro' then 5000 when 'enterprise' then 10000 else 50
  end;
  select (
    select count(*)::integer from public.transactions as transaction
    where transaction.user_id = actor_id
      and transaction.created_at >= date_trunc('month', now())
      and transaction.created_at < date_trunc('month', now()) + interval '1 month'
  ) + coalesce((
    select sum(reservation.transaction_count)::integer
    from private.analysis_quota_reservations as reservation
    where reservation.user_id = actor_id and reservation.expires_at > now()
  ), 0)
  into current_usage;
  if current_usage + p_transaction_count > monthly_limit then
    raise exception using
      errcode = 'P0001',
      message = 'TRANSACTION_QUOTA_EXCEEDED',
      detail = format('requested=%s, used=%s, limit=%s', p_transaction_count, current_usage, monthly_limit);
  end if;
  insert into private.analysis_quota_reservations (user_id, transaction_count)
  values (actor_id, p_transaction_count)
  returning id into reservation_id;
  return reservation_id;
end;
$$;

revoke all on function private.reserve_my_transaction_quota(integer)
  from public, anon, authenticated;
grant execute on function private.reserve_my_transaction_quota(integer)
  to authenticated;

comment on function private.reserve_my_transaction_quota(integer) is
  'Reservasi atomik kuota; batch gratis maksimal 50, Pro/Max maksimal 500 transaksi.';
