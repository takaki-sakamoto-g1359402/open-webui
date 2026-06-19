-- API rate-limit RPC smoke test.
-- Run after supabase/migrations have been applied.
-- The transaction intentionally rolls back so this can be run in staging or a
-- fresh Supabase project without leaving smoke rows behind.

begin;

select
  1 / case
    when not has_table_privilege('anon', 'public.api_rate_limits', 'select')
    then 1
    else 0
  end as anon_rate_limit_table_denied,
  1 / case
    when not has_table_privilege('authenticated', 'public.api_rate_limits', 'select')
    then 1
    else 0
  end as authenticated_rate_limit_table_denied;

select
  1 / case
    when not has_function_privilege(
      'anon',
      'public.check_api_rate_limit(text, integer, integer, timestamptz)',
      'execute'
    ) then 1
    else 0
  end as anon_rate_limit_rpc_denied,
  1 / case
    when not has_function_privilege(
      'authenticated',
      'public.check_api_rate_limit(text, integer, integer, timestamptz)',
      'execute'
    ) then 1
    else 0
  end as authenticated_rate_limit_rpc_denied,
  1 / case
    when has_function_privilege(
      'service_role',
      'public.check_api_rate_limit(text, integer, integer, timestamptz)',
      'execute'
    ) then 1
    else 0
  end as service_role_rate_limit_rpc_allowed;

set local role service_role;

create temp table smoke_rate_limit_first on commit drop as
select *
from public.check_api_rate_limit(
  repeat('a', 64),
  2,
  60,
  '2026-06-19T00:00:00Z'::timestamptz
);

create temp table smoke_rate_limit_second on commit drop as
select *
from public.check_api_rate_limit(
  repeat('a', 64),
  2,
  60,
  '2026-06-19T00:00:01Z'::timestamptz
);

create temp table smoke_rate_limit_third on commit drop as
select *
from public.check_api_rate_limit(
  repeat('a', 64),
  2,
  60,
  '2026-06-19T00:00:02Z'::timestamptz
);

create temp table smoke_rate_limit_reset on commit drop as
select *
from public.check_api_rate_limit(
  repeat('a', 64),
  2,
  60,
  '2026-06-19T00:01:01Z'::timestamptz
);

reset role;

do $$
begin
  if not exists (
    select 1 from smoke_rate_limit_first
    where allowed = true and current_count = 1
  ) then
    raise exception 'first rate-limit call should be allowed';
  end if;

  if not exists (
    select 1 from smoke_rate_limit_second
    where allowed = true and current_count = 2
  ) then
    raise exception 'second rate-limit call should be allowed';
  end if;

  if not exists (
    select 1 from smoke_rate_limit_third
    where allowed = false and current_count = 3
  ) then
    raise exception 'third rate-limit call should be blocked';
  end if;

  if not exists (
    select 1 from smoke_rate_limit_reset
    where allowed = true and current_count = 1
  ) then
    raise exception 'rate-limit bucket should reset after the window';
  end if;
end $$;

rollback;

