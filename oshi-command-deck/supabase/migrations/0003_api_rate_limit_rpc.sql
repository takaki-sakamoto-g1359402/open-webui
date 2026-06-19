create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  count integer not null check (count > 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

revoke all on public.api_rate_limits from public, anon, authenticated;

create index if not exists api_rate_limits_reset_at_idx
  on public.api_rate_limits(reset_at);

create or replace function public.check_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz default now()
)
returns table (
  allowed boolean,
  current_count integer,
  reset_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
  v_reset_at timestamptz;
begin
  perform set_config('statement_timeout', '5s', true);

  if p_bucket_key is null or length(trim(p_bucket_key)) < 32 then
    raise exception 'invalid_rate_limit_bucket';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_policy';
  end if;

  insert into public.api_rate_limits (
    bucket_key,
    count,
    reset_at,
    updated_at
  )
  values (
    p_bucket_key,
    1,
    p_now + make_interval(secs => p_window_seconds),
    p_now
  )
  on conflict (bucket_key) do update
  set
    count = case
      when public.api_rate_limits.reset_at <= p_now then 1
      else public.api_rate_limits.count + 1
    end,
    reset_at = case
      when public.api_rate_limits.reset_at <= p_now then p_now + make_interval(secs => p_window_seconds)
      else public.api_rate_limits.reset_at
    end,
    updated_at = p_now
  returning public.api_rate_limits.count, public.api_rate_limits.reset_at
    into v_count, v_reset_at;

  delete from public.api_rate_limits
  where reset_at < p_now - interval '1 hour';

  return query
  select
    v_count <= p_limit,
    v_count,
    v_reset_at;
end;
$$;

revoke execute on function public.check_api_rate_limit(text, integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.check_api_rate_limit(text, integer, integer, timestamptz)
  to service_role;

