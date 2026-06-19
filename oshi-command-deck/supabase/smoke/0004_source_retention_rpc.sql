-- Source retention RPC smoke test.
-- Run after supabase/migrations/0001_initial.sql has been applied.
-- The transaction intentionally rolls back so this can be run in staging or a
-- fresh Supabase project without leaving smoke rows behind.

begin;

insert into public.live_events (
  canonical_key,
  title,
  category,
  branch,
  languages,
  status,
  scheduled_start_at,
  visibility,
  confidence,
  is_demo
)
values (
  'youtube:SMOKE_SOURCE_RETENTION',
  'Smoke retention title',
  'game',
  'jp',
  array['ja'],
  'scheduled',
  now() + interval '1 hour',
  'public',
  0.8,
  true
);

insert into public.source_items (
  provider,
  source_type,
  provider_item_id,
  url,
  payload_jsonb,
  payload_hash,
  fetched_at,
  published_at
)
values
  (
    'youtube',
    'livestream',
    'SMOKE_RETENTION_OLD',
    'https://www.youtube.com/watch?v=SMOKE_RETENTION_OLD',
    jsonb_build_object('rawEvidence', jsonb_build_array(jsonb_build_object('rawExcerpt', 'old youtube api data'))),
    encode(sha256('smoke-retention-old'::bytea), 'hex'),
    now() - interval '35 days',
    now() - interval '36 days'
  ),
  (
    'youtube',
    'livestream',
    'SMOKE_RETENTION_FRESH',
    'https://www.youtube.com/watch?v=SMOKE_RETENTION_FRESH',
    jsonb_build_object('rawEvidence', jsonb_build_array(jsonb_build_object('rawExcerpt', 'fresh youtube api data'))),
    encode(sha256('smoke-retention-fresh'::bytea), 'hex'),
    now() - interval '5 days',
    now() - interval '5 days'
  );

insert into public.event_sources (
  live_event_id,
  source_item_id,
  confidence,
  field_map_jsonb
)
select
  live_event.id,
  source_item.id,
  0.8,
  jsonb_build_object('fields', jsonb_build_array('title'))
from public.live_events live_event
join public.source_items source_item
  on source_item.provider_item_id = 'SMOKE_RETENTION_OLD'
where live_event.canonical_key = 'youtube:SMOKE_SOURCE_RETENTION';

create temp table smoke_source_retention_dry_run on commit drop as
select *
from public.purge_stale_source_items(
  'youtube'::public.provider_kind,
  now() - interval '29 days',
  true
);

do $$
begin
  if not exists (
    select 1
    from smoke_source_retention_dry_run
    where stale_source_count = 1
      and detached_event_source_count = 1
      and deleted_source_count = 0
  ) then
    raise exception 'source retention dry-run did not return expected counts';
  end if;

  if not exists (
    select 1
    from public.source_items
    where provider_item_id = 'SMOKE_RETENTION_OLD'
  ) then
    raise exception 'source retention dry-run unexpectedly deleted data';
  end if;
end $$;

create temp table smoke_source_retention_apply on commit drop as
select *
from public.purge_stale_source_items(
  'youtube'::public.provider_kind,
  now() - interval '29 days',
  false
);

do $$
begin
  if not exists (
    select 1
    from smoke_source_retention_apply
    where stale_source_count = 1
      and detached_event_source_count = 1
      and deleted_source_count = 1
  ) then
    raise exception 'source retention apply did not return expected counts';
  end if;

  if exists (
    select 1
    from public.source_items
    where provider_item_id = 'SMOKE_RETENTION_OLD'
  ) then
    raise exception 'stale YouTube source item was not deleted';
  end if;

  if exists (
    select 1
    from public.event_sources event_source
    join public.source_items source_item on source_item.id = event_source.source_item_id
    where source_item.provider_item_id = 'SMOKE_RETENTION_OLD'
  ) then
    raise exception 'stale event_sources rows were not detached';
  end if;

  if not exists (
    select 1
    from public.source_items
    where provider_item_id = 'SMOKE_RETENTION_FRESH'
  ) then
    raise exception 'fresh YouTube source item was unexpectedly deleted';
  end if;

  if not exists (
    select 1
    from public.audit_logs
    where action = 'source_items.retention_purge'
      and table_name = 'source_items'
      and after_jsonb ->> 'provider' = 'youtube'
  ) then
    raise exception 'source retention audit row was not stored';
  end if;
end $$;

select
  1 / case
    when not has_function_privilege(
      'anon',
      'public.purge_stale_source_items(public.provider_kind, timestamptz, boolean)',
      'EXECUTE'
    ) then 1
    else 0
  end as anon_cannot_execute_source_retention;

select
  1 / case
    when not has_function_privilege(
      'authenticated',
      'public.purge_stale_source_items(public.provider_kind, timestamptz, boolean)',
      'EXECUTE'
    ) then 1
    else 0
  end as authenticated_cannot_execute_source_retention;

select
  1 / case
    when has_function_privilege(
      'service_role',
      'public.purge_stale_source_items(public.provider_kind, timestamptz, boolean)',
      'EXECUTE'
    ) then 1
    else 0
  end as service_role_can_execute_source_retention;

rollback;
