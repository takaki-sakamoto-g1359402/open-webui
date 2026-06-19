-- Manual correction RPC smoke test.
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
  stale_after_minutes,
  admin_corrected_fields,
  admin_correction_note,
  admin_corrected_at,
  is_demo,
  deleted_at
)
values (
  'manual:SMOKE_CORRECTION_RPC',
  'Smoke original title',
  'chat',
  'jp',
  array['ja'],
  'scheduled',
  '2026-06-19T12:00:00Z'::timestamptz,
  'public',
  0.420,
  45,
  '{}'::text[],
  null,
  null,
  true,
  null
)
on conflict (canonical_key) do update
set
  title = excluded.title,
  category = excluded.category,
  branch = excluded.branch,
  languages = excluded.languages,
  status = excluded.status,
  scheduled_start_at = excluded.scheduled_start_at,
  visibility = excluded.visibility,
  confidence = excluded.confidence,
  stale_after_minutes = excluded.stale_after_minutes,
  admin_corrected_fields = '{}'::text[],
  admin_correction_note = null,
  admin_corrected_at = null,
  deleted_at = null,
  updated_at = now();

insert into public.public_event_links (
  live_event_id,
  provider,
  url,
  label,
  embeddable
)
select
  id,
  'manual'::public.provider_kind,
  'https://example.com/smoke-correction-rpc',
  'Smoke source',
  false
from public.live_events
where canonical_key = 'manual:SMOKE_CORRECTION_RPC'
on conflict (live_event_id, provider, url) do update
set
  label = excluded.label,
  embeddable = excluded.embeddable;

set local role anon;

select
  1 / case when count(*) = 1 then 1 else 0 end as anon_public_live_events_visible
from public.public_live_events
where canonical_key = 'manual:SMOKE_CORRECTION_RPC';

select
  1 / case when count(*) = 1 then 1 else 0 end as anon_public_event_links_visible
from public.public_event_links
where url = 'https://example.com/smoke-correction-rpc';

do $$
declare
  v_table text;
  v_role text;
begin
  foreach v_role in array array['anon', 'authenticated']
  loop
    foreach v_table in array array[
      'admin_members',
      'source_items',
      'event_sources',
      'ingestion_runs',
      'provider_errors',
      'push_subscriptions',
      'push_delivery_receipts',
      'manual_corrections',
      'audit_logs'
    ]
    loop
      if has_table_privilege(v_role, format('public.%I', v_table), 'SELECT') then
        raise exception '% unexpectedly has direct SELECT on sensitive table %', v_role, v_table;
      end if;
      if has_table_privilege(v_role, format('public.%I', v_table), 'INSERT') then
        raise exception '% unexpectedly has direct INSERT on sensitive table %', v_role, v_table;
      end if;
    end loop;
  end loop;
end $$;

reset role;

create temp table smoke_manual_correction_result on commit drop as
select *
from public.apply_manual_correction(
  'manual:SMOKE_CORRECTION_RPC',
  'title',
  to_jsonb('Smoke corrected title'::text),
  'Smoke test correction validates audited RPC path.',
  'supabase-smoke',
  null,
  '127.0.0.1'::inet,
  'supabase-smoke'
);

do $$
declare
  v_event_id uuid;
  v_result_count integer;
  v_correction_count integer;
  v_audit_count integer;
begin
  select id
  into v_event_id
  from public.live_events
  where canonical_key = 'manual:SMOKE_CORRECTION_RPC';

  if v_event_id is null then
    raise exception 'smoke event was not inserted';
  end if;

  select count(*)
  into v_result_count
  from smoke_manual_correction_result
  where event_id = v_event_id and field_name = 'title';

  if v_result_count <> 1 then
    raise exception 'apply_manual_correction returned % rows, expected 1', v_result_count;
  end if;

  if not exists (
    select 1
    from public.live_events
    where id = v_event_id
      and title = 'Smoke corrected title'
      and 'title' = any(admin_corrected_fields)
      and admin_correction_note = 'Smoke test correction validates audited RPC path.'
      and admin_corrected_at is not null
  ) then
    raise exception 'live_events was not corrected and marked as admin-reviewed';
  end if;

  select count(*)
  into v_correction_count
  from public.manual_corrections
  where event_id = v_event_id
    and field_name = 'title'
    and admin_actor = 'supabase-smoke'
    and new_value = jsonb_build_object('value', to_jsonb('Smoke corrected title'::text));

  if v_correction_count <> 1 then
    raise exception 'manual_corrections row count was %, expected 1', v_correction_count;
  end if;

  select count(*)
  into v_audit_count
  from public.audit_logs
  where action = 'manual_corrections.apply'
    and table_name = 'live_events'
    and row_id = v_event_id
    and after_jsonb ->> 'fieldName' = 'title'
    and after_jsonb ->> 'reason' = 'Smoke test correction validates audited RPC path.';

  if v_audit_count <> 1 then
    raise exception 'audit_logs row count was %, expected 1', v_audit_count;
  end if;

  if has_function_privilege(
    'anon',
    'public.apply_manual_correction(text,text,jsonb,text,text,uuid,inet,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute apply_manual_correction';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.apply_manual_correction(text,text,jsonb,text,text,uuid,inet,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute apply_manual_correction directly';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.apply_manual_correction(text,text,jsonb,text,text,uuid,inet,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role must execute apply_manual_correction';
  end if;
end $$;

rollback;
