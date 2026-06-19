-- Ingestion persistence RPC smoke test.
-- Run after supabase/migrations/0001_initial.sql has been applied.
-- The transaction intentionally rolls back so this can be run in staging or a
-- fresh Supabase project without leaving smoke rows behind.

begin;

create temp table smoke_ingestion_payload on commit drop as
select
  jsonb_build_object(
    'mode', 'demo',
    'events', jsonb_build_array(
      jsonb_build_object(
        'creator_id', null,
        'canonical_key', 'manual:SMOKE_INGESTION_RPC',
        'title', 'Smoke ingestion title',
        'category', 'minecraft',
        'branch', 'jp',
        'languages', jsonb_build_array('ja'),
        'collaborators', jsonb_build_array('Elira Pendora'),
        'status', 'scheduled',
        'scheduled_start_at', '2026-06-19T12:00:00Z',
        'actual_start_at', null,
        'ended_at', null,
        'visibility', 'public',
        'confidence', 0.72,
        'stale_after_minutes', 45,
        'conflict_ids', jsonb_build_array(),
        'provider_error_summary', jsonb_build_array(),
        'is_demo', true,
        'updated_at', '2026-06-19T12:05:00Z'
      )
    ),
    'sources', jsonb_build_array(
      jsonb_build_object(
        'provider', 'manual',
        'source_type', 'livestream',
        'provider_item_id', 'SMOKE_INGESTION_SOURCE',
        'url', 'https://example.com/smoke-ingestion-rpc',
        'payload_jsonb', jsonb_build_object(
          'canonicalKey', 'manual:SMOKE_INGESTION_RPC',
          'rawEvidence', jsonb_build_array(
            jsonb_build_object(
              'sourceId', 'SMOKE_INGESTION_SOURCE',
              'rawExcerpt', 'Smoke raw source excerpt',
              'fields', jsonb_build_array('title', 'scheduledStart')
            )
          )
        ),
        'payload_hash', encode(sha256('smoke-ingestion-source'::bytea), 'hex'),
        'fetched_at', '2026-06-19T12:05:00Z',
        'published_at', '2026-06-19T12:00:00Z'
      )
    ),
    'eventSources', jsonb_build_array(
      jsonb_build_object(
        'live_event_canonical_key', 'manual:SMOKE_INGESTION_RPC',
        'provider', 'manual',
        'provider_item_id', 'SMOKE_INGESTION_SOURCE',
        'confidence', 0.72,
        'field_map_jsonb', jsonb_build_object('fields', jsonb_build_array('title', 'scheduledStart'))
      )
    ),
    'publicLinks', jsonb_build_array(
      jsonb_build_object(
        'live_event_canonical_key', 'manual:SMOKE_INGESTION_RPC',
        'provider', 'manual',
        'url', 'https://example.com/smoke-ingestion-rpc',
        'label', 'Smoke source',
        'embeddable', false
      )
    ),
    'runs', jsonb_build_array(
      jsonb_build_object(
        'adapter', 'manual',
        'status', 'partial',
        'finished_at', '2026-06-19T12:05:05Z',
        'request_count', 0,
        'quota_cost', 0,
        'error_summary', 'smoke_rate_limit'
      )
    ),
    'providerErrors', jsonb_build_array(
      jsonb_build_object(
        'run_adapter', 'manual',
        'provider', 'manual',
        'http_status', 429,
        'provider_code', 'smoke_rate_limit',
        'retry_after_at', '2026-06-19T12:15:00Z',
        'is_transient', true,
        'raw_excerpt', 'Smoke provider error excerpt'
      )
    ),
    'reconcileEdges', true,
    'audit', jsonb_build_object(
      'mode', 'demo',
      'eventCount', 1,
      'sourceCount', 1,
      'eventSourceCount', 1,
      'publicLinkCount', 1,
      'runCount', 1
    )
  ) as payload;

create temp table smoke_ingestion_rpc_result on commit drop as
select *
from public.persist_ingestion_run((select payload from smoke_ingestion_payload));

do $$
declare
  v_event_id uuid;
  v_run_id uuid;
begin
  select id
  into v_event_id
  from public.live_events
  where canonical_key = 'manual:SMOKE_INGESTION_RPC';

  if v_event_id is null then
    raise exception 'persist_ingestion_run did not upsert live_events';
  end if;

  if not exists (
    select 1
    from smoke_ingestion_rpc_result
    where event_count = 1
      and source_count = 1
      and event_source_count = 1
      and public_link_count = 1
      and run_count = 1
  ) then
    raise exception 'persist_ingestion_run did not return expected counts';
  end if;

  if not exists (
    select 1
    from public.source_items
    where provider = 'manual'::public.provider_kind
      and provider_item_id = 'SMOKE_INGESTION_SOURCE'
      and payload_jsonb #>> '{rawEvidence,0,rawExcerpt}' = 'Smoke raw source excerpt'
  ) then
    raise exception 'source_items raw evidence was not stored';
  end if;

  if not exists (
    select 1
    from public.event_sources event_source
    join public.source_items source_item on source_item.id = event_source.source_item_id
    where event_source.live_event_id = v_event_id
      and source_item.provider_item_id = 'SMOKE_INGESTION_SOURCE'
  ) then
    raise exception 'event_sources link was not stored';
  end if;

  if not exists (
    select 1
    from public.public_event_links
    where live_event_id = v_event_id
      and url = 'https://example.com/smoke-ingestion-rpc'
  ) then
    raise exception 'public_event_links row was not stored';
  end if;

  select id
  into v_run_id
  from public.ingestion_runs
  where adapter = 'manual'::public.provider_kind
    and error_summary = 'smoke_rate_limit'
  order by started_at desc
  limit 1;

  if v_run_id is null then
    raise exception 'ingestion_runs row was not stored';
  end if;

  if not exists (
    select 1
    from public.provider_errors
    where run_id = v_run_id
      and http_status = 429
      and provider_code = 'smoke_rate_limit'
      and raw_excerpt = 'Smoke provider error excerpt'
  ) then
    raise exception 'provider_errors row was not stored';
  end if;

  if not exists (
    select 1
    from public.audit_logs
    where action = 'ingestion.persist'
      and table_name = 'live_events'
      and after_jsonb ->> 'mode' = 'demo'
  ) then
    raise exception 'ingestion audit row was not stored';
  end if;
end $$;

create temp table smoke_ingestion_rpc_idempotency_result on commit drop as
select *
from public.persist_ingestion_run((select payload from smoke_ingestion_payload));

do $$
declare
  v_event_count integer;
  v_source_count integer;
  v_event_source_count integer;
  v_public_link_count integer;
begin
  select count(*)
  into v_event_count
  from public.live_events
  where canonical_key = 'manual:SMOKE_INGESTION_RPC';

  select count(*)
  into v_source_count
  from public.source_items
  where provider = 'manual'::public.provider_kind
    and provider_item_id = 'SMOKE_INGESTION_SOURCE';

  select count(*)
  into v_event_source_count
  from public.event_sources event_source
  join public.live_events event on event.id = event_source.live_event_id
  join public.source_items source_item on source_item.id = event_source.source_item_id
  where event.canonical_key = 'manual:SMOKE_INGESTION_RPC'
    and source_item.provider = 'manual'::public.provider_kind
    and source_item.provider_item_id = 'SMOKE_INGESTION_SOURCE';

  select count(*)
  into v_public_link_count
  from public.public_event_links link
  join public.live_events event on event.id = link.live_event_id
  where event.canonical_key = 'manual:SMOKE_INGESTION_RPC'
    and link.url = 'https://example.com/smoke-ingestion-rpc';

  if v_event_count <> 1 or v_source_count <> 1 or v_event_source_count <> 1 or v_public_link_count <> 1 then
    raise exception
      'idempotent ingestion did not keep canonical/source/link counts stable: events %, sources %, event_sources %, public_links %',
      v_event_count,
      v_source_count,
      v_event_source_count,
      v_public_link_count;
  end if;

  if not exists (
    select 1
    from smoke_ingestion_rpc_idempotency_result
    where event_count = 1
      and source_count = 1
      and event_source_count = 1
      and public_link_count = 1
      and run_count = 1
  ) then
    raise exception 'idempotent ingestion retry did not return expected counts';
  end if;
end $$;

update public.live_events
set
  title = 'Admin guarded smoke title',
  confidence = 0.55,
  admin_corrected_fields = array['title', 'confidence'],
  admin_correction_note = 'Smoke guard',
  admin_corrected_at = now()
where canonical_key = 'manual:SMOKE_INGESTION_RPC';

create temp table smoke_ingestion_rpc_reconcile_result on commit drop as
select *
from public.persist_ingestion_run(
  jsonb_build_object(
    'mode', 'demo',
    'events', jsonb_build_array(
      jsonb_build_object(
        'creator_id', null,
        'canonical_key', 'manual:SMOKE_INGESTION_RPC',
        'title', 'Provider title should not overwrite admin title',
        'category', 'minecraft',
        'branch', 'jp',
        'languages', jsonb_build_array('ja'),
        'collaborators', jsonb_build_array(),
        'status', 'live',
        'scheduled_start_at', '2026-06-19T12:00:00Z',
        'actual_start_at', '2026-06-19T12:03:00Z',
        'ended_at', null,
        'visibility', 'public',
        'confidence', 0.99,
        'stale_after_minutes', 30,
        'conflict_ids', jsonb_build_array(),
        'provider_error_summary', jsonb_build_array(),
        'is_demo', true,
        'updated_at', '2026-06-19T12:10:00Z'
      )
    ),
    'sources', jsonb_build_array(),
    'eventSources', jsonb_build_array(),
    'publicLinks', jsonb_build_array(),
    'runs', jsonb_build_array(),
    'providerErrors', jsonb_build_array(),
    'reconcileEdges', true,
    'audit', jsonb_build_object(
      'mode', 'demo',
      'eventCount', 1,
      'sourceCount', 0,
      'eventSourceCount', 0,
      'publicLinkCount', 0,
      'runCount', 0
    )
  )
);

do $$
declare
  v_event_id uuid;
begin
  select id
  into v_event_id
  from public.live_events
  where canonical_key = 'manual:SMOKE_INGESTION_RPC';

  if not exists (
    select 1
    from public.live_events
    where id = v_event_id
      and title = 'Admin guarded smoke title'
      and confidence = 0.55
      and status = 'live'::public.stream_status
  ) then
    raise exception 'admin-corrected fields were not guarded during ingestion';
  end if;

  if exists (
    select 1
    from public.event_sources
    where live_event_id = v_event_id
  ) then
    raise exception 'stale event_sources rows were not reconciled';
  end if;

  if exists (
    select 1
    from public.public_event_links
    where live_event_id = v_event_id
  ) then
    raise exception 'stale public_event_links rows were not reconciled';
  end if;

  if has_function_privilege(
    'anon',
    'public.persist_ingestion_run(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute persist_ingestion_run';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.persist_ingestion_run(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute persist_ingestion_run directly';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.persist_ingestion_run(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'service_role must execute persist_ingestion_run';
  end if;
end $$;

rollback;
