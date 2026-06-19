-- Branch and provider registry constraint smoke test.
-- Run after supabase/migrations/0001_initial.sql has been applied.
-- The transaction intentionally rolls back so this can be run in staging or a
-- fresh Supabase project without leaving smoke rows behind.

begin;

set local role anon;

select
  1 / case when count(*) >= 5 then 1 else 0 end as anon_branches_visible
from public.branches;

reset role;

select
  1 / case
    when not has_function_privilege(
      'anon',
      'public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text)',
      'execute'
    )
    then 1
    else 0
  end as anon_registry_rpc_denied,
  1 / case
    when not has_function_privilege(
      'authenticated',
      'public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text)',
      'execute'
    )
    then 1
    else 0
  end as authenticated_registry_rpc_denied,
  1 / case
    when has_function_privilege(
      'service_role',
      'public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text)',
      'execute'
    )
    then 1
    else 0
  end as service_role_registry_rpc_allowed;

set local role service_role;

create temp table smoke_registry_rpc_result as
select *
from public.upsert_creator_channel_registry(
  'youtube',
  'UCsmokeregistryrpc123456',
  'Registry RPC Smoke',
  'registry-rpc-smoke',
  'jp',
  array['ja'],
  array['game'],
  array['レジストリRPC'],
  0.87,
  true,
  'smoke-admin',
  null,
  '203.0.113.50'::inet,
  'supabase-smoke'
);

reset role;

do $$
begin
  if not exists (
    select 1
    from smoke_registry_rpc_result
    where provider_channel_id = 'UCsmokeregistryrpc123456'
      and slug = 'registry-rpc-smoke'
      and confidence = 0.87
  ) then
    raise exception 'registry RPC did not return the upserted channel row';
  end if;

  if not exists (
    select 1
    from public.creator_channels
    where provider = 'youtube'
      and provider_channel_id = 'UCsmokeregistryrpc123456'
      and slug = 'registry-rpc-smoke'
  ) then
    raise exception 'registry RPC did not upsert creator channel row';
  end if;

  if not exists (
    select 1
    from public.audit_logs
    where action = 'creator_channels.upsert'
      and table_name = 'creator_channels'
      and row_id = (select id from smoke_registry_rpc_result limit 1)
      and after_jsonb ->> 'actor' = 'smoke-admin'
  ) then
    raise exception 'registry RPC did not write the audit row atomically';
  end if;
end $$;

do $$
begin
  begin
    insert into public.creator_channels (
      provider,
      provider_channel_id,
      display_name,
      slug,
      branch,
      languages,
      tags,
      confidence,
      is_active
    )
    values (
      'youtube',
      'UCabcdefghijklmnopqrstuv',
      'Unknown Branch Smoke',
      'unknown-branch-smoke',
      'unknown',
      array['ja'],
      array['game'],
      0.8,
      true
    );
    raise exception 'unknown branch insert unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%unknown_branch%' and sqlerrm not like '%foreign key%' then
        raise;
      end if;
  end;

  begin
    insert into public.creator_channels (
      provider,
      provider_channel_id,
      display_name,
      slug,
      branch,
      languages,
      tags,
      confidence,
      is_active
    )
    values (
      'x',
      'invalid-handle-with-dash',
      'Invalid Handle Smoke',
      'invalid-handle-smoke',
      'jp',
      array['ja'],
      array['game'],
      0.8,
      true
    );
    raise exception 'invalid X handle insert unexpectedly succeeded';
  exception
    when check_violation then
      null;
  end;

  begin
    insert into public.creator_channels (
      provider,
      provider_channel_id,
      display_name,
      slug,
      branch,
      languages,
      tags,
      confidence,
      is_active
    )
    values (
      'youtube',
      'UCabcdefghijklmnopqrstuv',
      'Manual Branch Live Smoke',
      'manual-branch-live-smoke',
      'id',
      array['id'],
      array['game'],
      0.8,
      true
    );
    raise exception 'manual-only branch live provider insert unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%branch_not_open_for_live_provider%' then
        raise;
      end if;
  end;

  insert into public.creator_channels (
    provider,
    provider_channel_id,
    display_name,
    slug,
    branch,
    languages,
    tags,
    confidence,
    is_active
  )
  values (
    'youtube',
    'UCabcdefghijklmnopqrstuv',
    'Inactive Manual Branch Smoke',
    'inactive-manual-branch-smoke',
    'id',
    array['id'],
    array['game'],
    0.8,
    false
  );

  if not exists (
    select 1
    from public.creator_channels
    where slug = 'inactive-manual-branch-smoke'
      and is_active = false
      and branch = 'id'
  ) then
    raise exception 'inactive manual-only branch provider row was not allowed';
  end if;
end $$;

rollback;
