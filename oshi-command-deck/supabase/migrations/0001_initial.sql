create extension if not exists pgcrypto;

create type public.provider_kind as enum ('youtube', 'x', 'manual', 'future');
create type public.branch_coverage as enum ('active', 'demo', 'manual_only', 'future');
create type public.stream_status as enum ('scheduled', 'live', 'ended', 'tbd', 'unverified');
create type public.ingestion_status as enum ('queued', 'running', 'success', 'failed', 'partial');

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'reviewer')),
  created_at timestamptz not null default now()
);

create table public.branches (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  label text not null,
  locale_hints text[] not null default '{}',
  coverage public.branch_coverage not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.branches (id, label, locale_hints, coverage, notes)
values
  ('jp', 'NIJISANJI JP', '{ja-JP,ja}', 'demo', 'Demo registry entries only. Production coverage requires explicit admin channel configuration.'),
  ('en', 'NIJISANJI EN', '{en-US,en-GB,en}', 'demo', 'Demo registry entries only. Production coverage requires explicit admin channel configuration.'),
  ('id', 'NIJISANJI ID', '{id-ID,id}', 'manual_only', 'Legacy/merged branch reference. Add active provider IDs only when source ownership is verified.'),
  ('kr', 'NIJISANJI KR', '{ko-KR,ko}', 'manual_only', 'Legacy/merged branch reference. Add active provider IDs only when source ownership is verified.'),
  ('future', 'Future sources', '{}', 'future', 'Reserved for additional official APIs, admin-imported providers, or branch taxonomy changes.')
on conflict (id) do update
set
  label = excluded.label,
  locale_hints = excluded.locale_hints,
  coverage = excluded.coverage,
  notes = excluded.notes,
  updated_at = now();

create table public.creator_channels (
  id uuid primary key default gen_random_uuid(),
  provider public.provider_kind not null,
  provider_channel_id text not null,
  display_name text not null,
  slug text not null,
  branch text not null references public.branches(id) on update cascade,
  languages text[] not null default '{}',
  tags text[] not null default '{}',
  aliases text[] not null default '{}',
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9][a-z0-9_-]*$'),
  check (
    (provider = 'youtube' and provider_channel_id ~ '^(UC[A-Za-z0-9_-]{20,}|DEMO_[A-Z0-9_]+)$')
    or (provider = 'x' and provider_channel_id ~ '^@?[A-Za-z0-9_]{1,15}$')
    or (provider in ('manual', 'future') and provider_channel_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$')
  ),
  unique (provider, slug),
  unique (provider, provider_channel_id)
);

create table public.live_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creator_channels(id) on delete set null,
  canonical_key text not null unique,
  title text not null,
  category text not null,
  branch text not null references public.branches(id) on update cascade,
  languages text[] not null default '{}',
  collaborators text[] not null default '{}',
  status public.stream_status not null default 'unverified',
  scheduled_start_at timestamptz,
  actual_start_at timestamptz,
  ended_at timestamptz,
  visibility text not null default 'unknown' check (visibility in ('public', 'unlisted', 'unknown')),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  stale_after_minutes integer not null default 45,
  conflict_ids text[] not null default '{}',
  provider_error_summary jsonb not null default '[]'::jsonb,
  admin_corrected_fields text[] not null default '{}',
  admin_correction_note text,
  admin_corrected_at timestamptz,
  is_demo boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  provider public.provider_kind not null,
  source_type text not null,
  provider_item_id text,
  url text,
  payload_jsonb jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  fetched_at timestamptz not null default now(),
  published_at timestamptz,
  etag text,
  unique (provider, provider_item_id),
  check (provider_item_id is not null or payload_hash <> '')
);

create table public.event_sources (
  live_event_id uuid not null references public.live_events(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete restrict,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  field_map_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (live_event_id, source_item_id)
);

create table public.public_event_links (
  live_event_id uuid not null references public.live_events(id) on delete cascade,
  provider public.provider_kind not null,
  url text not null,
  label text not null,
  embeddable boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (live_event_id, provider, url)
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  adapter public.provider_kind not null,
  status public.ingestion_status not null default 'queued',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  cursor_before text,
  cursor_after text,
  request_count integer not null default 0,
  quota_cost integer not null default 0,
  error_summary text
);

create table public.provider_errors (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ingestion_runs(id) on delete cascade,
  provider public.provider_kind not null,
  http_status integer,
  provider_code text not null,
  retry_after_at timestamptz,
  is_transient boolean not null default false,
  raw_excerpt text,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys_jsonb jsonb not null,
  alert_types_jsonb jsonb not null default '{}'::jsonb,
  preferences_jsonb jsonb not null default '{}'::jsonb,
  user_agent text,
  ip inet,
  is_active boolean not null default true,
  deactivated_at timestamptz,
  deactivation_reason text check (
    deactivation_reason is null
    or deactivation_reason in ('user_unsubscribe', 'push_404', 'push_410', 'push_expired', 'unknown')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  notification_key text not null,
  stream_id text not null,
  canonical_key text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  payload_hash text not null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (subscription_id, notification_key)
);

create table public.manual_corrections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.live_events(id) on delete cascade,
  field_name text not null,
  old_value jsonb,
  new_value jsonb not null,
  reason text not null,
  admin_user_id uuid references auth.users(id) on delete restrict,
  admin_actor text not null default 'admin-token',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  row_id uuid,
  before_jsonb jsonb,
  after_jsonb jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index creator_channels_provider_active_idx on public.creator_channels(provider, is_active);
create index creator_channels_branch_active_idx on public.creator_channels(branch, is_active);
create index live_events_status_time_idx on public.live_events(status, scheduled_start_at);
create index live_events_creator_time_idx on public.live_events(creator_id, scheduled_start_at desc);
create index live_events_public_scheduled_idx on public.live_events(scheduled_start_at) where deleted_at is null;
create index source_items_provider_item_idx on public.source_items(provider, provider_item_id);
create index source_items_provider_payload_hash_idx on public.source_items(provider, payload_hash);
create index source_items_provider_fetched_idx on public.source_items(provider, fetched_at desc);
create index event_sources_source_item_idx on public.event_sources(source_item_id);
create index public_event_links_event_idx on public.public_event_links(live_event_id);
create index ingestion_runs_adapter_started_idx on public.ingestion_runs(adapter, started_at desc);
create index provider_errors_run_idx on public.provider_errors(run_id);
create index provider_errors_retry_idx on public.provider_errors(provider, retry_after_at) where is_transient = true;
create index provider_errors_transient_retry_time_idx on public.provider_errors(retry_after_at desc) where is_transient = true;
create index push_subscriptions_active_idx on public.push_subscriptions(updated_at desc) where is_active = true;
create index push_delivery_receipts_subscription_time_idx on public.push_delivery_receipts(subscription_id, created_at desc);
create index manual_corrections_event_time_idx on public.manual_corrections(event_id, created_at desc);
create index manual_corrections_admin_user_time_idx on public.manual_corrections(admin_user_id, created_at desc);
create index audit_logs_actor_time_idx on public.audit_logs(actor_user_id, created_at desc);
create index audit_logs_created_time_idx on public.audit_logs(created_at desc);

create view public.public_creator_channels
with (security_invoker = true) as
select id, provider, provider_channel_id, display_name, slug, branch, languages, tags, aliases, confidence, is_active
from public.creator_channels
where is_active = true;

create view public.public_live_events
with (security_invoker = true) as
select
  e.id,
  e.creator_id,
  c.slug as creator_slug,
  c.display_name as creator_display_name,
  e.canonical_key,
  e.title,
  e.category,
  e.branch,
  e.languages,
  e.collaborators,
  e.status,
  e.scheduled_start_at,
  e.actual_start_at,
  e.ended_at,
  e.visibility,
  e.confidence,
  e.stale_after_minutes,
  e.conflict_ids,
  e.provider_error_summary,
  e.admin_corrected_fields,
  e.admin_correction_note,
  e.admin_corrected_at,
  e.is_demo,
  e.updated_at
from public.live_events e
left join public.creator_channels c on c.id = e.creator_id
where e.deleted_at is null;

alter table public.admin_members enable row level security;
alter table public.branches enable row level security;
alter table public.creator_channels enable row level security;
alter table public.live_events enable row level security;
alter table public.source_items enable row level security;
alter table public.event_sources enable row level security;
alter table public.public_event_links enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.provider_errors enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_receipts enable row level security;
alter table public.manual_corrections enable row level security;
alter table public.audit_logs enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = (select auth.uid()) and role in ('owner', 'admin', 'reviewer')
  );
$$;

create function public.can_admin_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = (select auth.uid()) and role in ('owner', 'admin')
  );
$$;

create policy "admin members read own role"
on public.admin_members for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy "public read branches"
on public.branches for select
to anon, authenticated
using (true);

create policy "admins write branches"
on public.branches for all
to authenticated
using (public.can_admin_write())
with check (public.can_admin_write());

create policy "admins read creator channels"
on public.creator_channels for select
to authenticated
using (public.is_admin());

create policy "public read active creator channels"
on public.creator_channels for select
to anon, authenticated
using (is_active = true);

create policy "admins write creator channels"
on public.creator_channels for all
to authenticated
using (public.can_admin_write())
with check (public.can_admin_write());

create policy "admins read live events"
on public.live_events for select
to authenticated
using (public.is_admin());

create policy "public read visible live events"
on public.live_events for select
to anon, authenticated
using (deleted_at is null);

create policy "admins write live events"
on public.live_events for all
to authenticated
using (public.can_admin_write())
with check (public.can_admin_write());

create policy "admins read raw source items"
on public.source_items for select
to authenticated
using (public.is_admin());

create policy "admins read event sources"
on public.event_sources for select
to authenticated
using (public.is_admin());

create policy "public read event links"
on public.public_event_links for select
to anon, authenticated
using (
  exists (
    select 1 from public.live_events e
    where e.id = public.public_event_links.live_event_id and e.deleted_at is null
  )
);

create policy "admins write event links"
on public.public_event_links for all
to authenticated
using (public.can_admin_write())
with check (public.can_admin_write());

create policy "admins read ingestion runs"
on public.ingestion_runs for select
to authenticated
using (public.is_admin());

create policy "admins read provider errors"
on public.provider_errors for select
to authenticated
using (public.is_admin());

create policy "admins read push subscriptions"
on public.push_subscriptions for select
to authenticated
using (public.is_admin());

create policy "admins read push delivery receipts"
on public.push_delivery_receipts for select
to authenticated
using (public.is_admin());

create policy "admins write manual corrections"
on public.manual_corrections for insert
to authenticated
with check (public.can_admin_write());

create policy "admins read manual corrections"
on public.manual_corrections for select
to authenticated
using (public.is_admin());

create policy "admins read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.validate_creator_channel_registry()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_coverage public.branch_coverage;
begin
  select coverage
  into v_coverage
  from public.branches
  where id = new.branch;

  if v_coverage is null then
    raise exception 'unknown_branch';
  end if;

  if new.is_active and new.provider in ('youtube', 'x') and v_coverage not in ('active', 'demo') then
    raise exception 'branch_not_open_for_live_provider';
  end if;

  return new;
end;
$$;

create function public.apply_manual_correction(
  p_canonical_key text,
  p_field_name text,
  p_new_value jsonb,
  p_reason text,
  p_admin_actor text default 'admin-token',
  p_admin_user_id uuid default null,
  p_ip inet default null,
  p_user_agent text default null
)
returns table (
  correction_id uuid,
  event_id uuid,
  field_name text,
  corrected_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_event public.live_events%rowtype;
  v_text_value text;
  v_numeric_value numeric;
  v_timestamptz_value timestamptz;
  v_old_value jsonb;
  v_new_value jsonb;
  v_corrected_at timestamptz := now();
begin
  if p_field_name not in (
    'title',
    'category',
    'status',
    'scheduled_start_at',
    'actual_start_at',
    'ended_at',
    'visibility',
    'confidence'
  ) then
    raise exception 'invalid_field_name';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception 'invalid_reason';
  end if;

  select *
  into v_event
  from public.live_events
  where canonical_key = p_canonical_key
  for update;

  if not found then
    return;
  end if;

  if p_field_name in ('title', 'category', 'status', 'visibility') then
    v_text_value := trim(coalesce(p_new_value #>> '{}', ''));
    if v_text_value = '' then
      raise exception 'invalid_text';
    end if;
  end if;

  case p_field_name
    when 'title' then
      v_old_value := to_jsonb(v_event.title);
      v_new_value := to_jsonb(v_text_value);
      update public.live_events set title = v_text_value where id = v_event.id;
    when 'category' then
      if v_text_value not in ('chat', 'game', 'minecraft', 'music', 'collaboration', 'event', 'other') then
        raise exception 'invalid_category';
      end if;
      v_old_value := to_jsonb(v_event.category);
      v_new_value := to_jsonb(v_text_value);
      update public.live_events set category = v_text_value where id = v_event.id;
    when 'status' then
      if v_text_value not in ('scheduled', 'live', 'ended', 'tbd', 'unverified') then
        raise exception 'invalid_status';
      end if;
      v_old_value := to_jsonb(v_event.status);
      v_new_value := to_jsonb(v_text_value);
      update public.live_events set status = v_text_value::public.stream_status where id = v_event.id;
    when 'scheduled_start_at' then
      v_old_value := to_jsonb(v_event.scheduled_start_at);
      if p_new_value = 'null'::jsonb then
        v_timestamptz_value := null;
      else
        v_timestamptz_value := (p_new_value #>> '{}')::timestamptz;
      end if;
      v_new_value := to_jsonb(v_timestamptz_value);
      update public.live_events set scheduled_start_at = v_timestamptz_value where id = v_event.id;
    when 'actual_start_at' then
      v_old_value := to_jsonb(v_event.actual_start_at);
      if p_new_value = 'null'::jsonb then
        v_timestamptz_value := null;
      else
        v_timestamptz_value := (p_new_value #>> '{}')::timestamptz;
      end if;
      v_new_value := to_jsonb(v_timestamptz_value);
      update public.live_events set actual_start_at = v_timestamptz_value where id = v_event.id;
    when 'ended_at' then
      v_old_value := to_jsonb(v_event.ended_at);
      if p_new_value = 'null'::jsonb then
        v_timestamptz_value := null;
      else
        v_timestamptz_value := (p_new_value #>> '{}')::timestamptz;
      end if;
      v_new_value := to_jsonb(v_timestamptz_value);
      update public.live_events set ended_at = v_timestamptz_value where id = v_event.id;
    when 'visibility' then
      if v_text_value not in ('public', 'unlisted', 'unknown') then
        raise exception 'invalid_visibility';
      end if;
      v_old_value := to_jsonb(v_event.visibility);
      v_new_value := to_jsonb(v_text_value);
      update public.live_events set visibility = v_text_value where id = v_event.id;
    when 'confidence' then
      v_numeric_value := (p_new_value #>> '{}')::numeric;
      if v_numeric_value < 0 or v_numeric_value > 1 then
        raise exception 'invalid_confidence';
      end if;
      v_old_value := to_jsonb(v_event.confidence);
      v_new_value := to_jsonb(v_numeric_value);
      update public.live_events set confidence = v_numeric_value where id = v_event.id;
  end case;

  update public.live_events
  set
    admin_corrected_fields = case
      when p_field_name = any(admin_corrected_fields) then admin_corrected_fields
      else admin_corrected_fields || p_field_name
    end,
    admin_correction_note = p_reason,
    admin_corrected_at = v_corrected_at,
    updated_at = v_corrected_at
  where id = v_event.id;

  insert into public.manual_corrections (
    event_id,
    field_name,
    old_value,
    new_value,
    reason,
    admin_actor,
    admin_user_id
  )
  values (
    v_event.id,
    p_field_name,
    jsonb_build_object('value', v_old_value),
    jsonb_build_object('value', v_new_value),
    p_reason,
    coalesce(nullif(trim(p_admin_actor), ''), 'admin-token'),
    p_admin_user_id
  )
  returning id into correction_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    table_name,
    row_id,
    after_jsonb,
    ip,
    user_agent
  )
  values (
    p_admin_user_id,
    'manual_corrections.apply',
    'live_events',
    v_event.id,
    jsonb_build_object(
      'fieldName', p_field_name,
      'oldValue', v_old_value,
      'newValue', v_new_value,
      'reason', p_reason,
      'correctionId', correction_id
    ),
    p_ip,
    p_user_agent
  );

  event_id := v_event.id;
  field_name := p_field_name;
  corrected_at := v_corrected_at;
  return next;
end;
$$;

create function public.persist_ingestion_run(p_payload jsonb)
returns table (
  event_count integer,
  source_count integer,
  event_source_count integer,
  public_link_count integer,
  run_count integer
)
language plpgsql
set search_path = public
as $$
declare
  v_provider_error_count integer;
begin
  perform set_config('statement_timeout', '15s', true);
  perform pg_advisory_xact_lock(hashtext('oshi_command_deck_ingestion')::bigint);

  insert into public.live_events (
    creator_id,
    canonical_key,
    title,
    category,
    branch,
    languages,
    collaborators,
    status,
    scheduled_start_at,
    actual_start_at,
    ended_at,
    visibility,
    confidence,
    stale_after_minutes,
    conflict_ids,
    provider_error_summary,
    is_demo,
    deleted_at,
    updated_at
  )
  select
    creator_id,
    canonical_key,
    title,
    category,
    branch,
    coalesce(languages, '{}'::text[]),
    coalesce(collaborators, '{}'::text[]),
    status::public.stream_status,
    scheduled_start_at,
    actual_start_at,
    ended_at,
    visibility,
    confidence,
    stale_after_minutes,
    coalesce(conflict_ids, '{}'::text[]),
    coalesce(provider_error_summary, '[]'::jsonb),
    coalesce(is_demo, false),
    null,
    updated_at
  from jsonb_to_recordset(coalesce(p_payload -> 'events', '[]'::jsonb)) as event_row (
    creator_id uuid,
    canonical_key text,
    title text,
    category text,
    branch text,
    languages text[],
    collaborators text[],
    status text,
    scheduled_start_at timestamptz,
    actual_start_at timestamptz,
    ended_at timestamptz,
    visibility text,
    confidence numeric,
    stale_after_minutes integer,
    conflict_ids text[],
    provider_error_summary jsonb,
    is_demo boolean,
    updated_at timestamptz
  )
  on conflict (canonical_key) do update
  set
    creator_id = excluded.creator_id,
    title = case
      when 'title' = any(live_events.admin_corrected_fields) then live_events.title
      else excluded.title
    end,
    category = case
      when 'category' = any(live_events.admin_corrected_fields) then live_events.category
      else excluded.category
    end,
    branch = excluded.branch,
    languages = excluded.languages,
    collaborators = excluded.collaborators,
    status = case
      when 'status' = any(live_events.admin_corrected_fields) then live_events.status
      else excluded.status
    end,
    scheduled_start_at = case
      when 'scheduled_start_at' = any(live_events.admin_corrected_fields) then live_events.scheduled_start_at
      else excluded.scheduled_start_at
    end,
    actual_start_at = case
      when 'actual_start_at' = any(live_events.admin_corrected_fields) then live_events.actual_start_at
      else excluded.actual_start_at
    end,
    ended_at = case
      when 'ended_at' = any(live_events.admin_corrected_fields) then live_events.ended_at
      else excluded.ended_at
    end,
    visibility = case
      when 'visibility' = any(live_events.admin_corrected_fields) then live_events.visibility
      else excluded.visibility
    end,
    confidence = case
      when 'confidence' = any(live_events.admin_corrected_fields) then live_events.confidence
      else excluded.confidence
    end,
    stale_after_minutes = excluded.stale_after_minutes,
    conflict_ids = excluded.conflict_ids,
    provider_error_summary = excluded.provider_error_summary,
    is_demo = excluded.is_demo,
    deleted_at = null,
    updated_at = excluded.updated_at;
  get diagnostics event_count = row_count;

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
  select
    provider::public.provider_kind,
    source_type,
    provider_item_id,
    url,
    coalesce(payload_jsonb, '{}'::jsonb),
    payload_hash,
    fetched_at,
    published_at
  from jsonb_to_recordset(coalesce(p_payload -> 'sources', '[]'::jsonb)) as source_row (
    provider text,
    source_type text,
    provider_item_id text,
    url text,
    payload_jsonb jsonb,
    payload_hash text,
    fetched_at timestamptz,
    published_at timestamptz
  )
  on conflict (provider, provider_item_id) do update
  set
    source_type = excluded.source_type,
    url = excluded.url,
    payload_jsonb = excluded.payload_jsonb,
    payload_hash = excluded.payload_hash,
    fetched_at = excluded.fetched_at,
    published_at = excluded.published_at,
    etag = source_items.etag;
  get diagnostics source_count = row_count;

  with event_keys as (
    select canonical_key
    from jsonb_to_recordset(coalesce(p_payload -> 'events', '[]'::jsonb)) as event_row (
      canonical_key text
    )
  ),
  incoming_sources as (
    select
      live_event_canonical_key,
      provider,
      provider_item_id
    from jsonb_to_recordset(coalesce(p_payload -> 'eventSources', '[]'::jsonb)) as source_row (
      live_event_canonical_key text,
      provider text,
      provider_item_id text
    )
  )
  delete from public.event_sources existing
  using public.live_events event_row, event_keys
  where existing.live_event_id = event_row.id
    and coalesce((p_payload ->> 'reconcileEdges')::boolean, false)
    and event_row.canonical_key = event_keys.canonical_key
    and not exists (
      select 1
      from incoming_sources incoming
      join public.source_items source_item
        on source_item.provider = incoming.provider::public.provider_kind
       and source_item.provider_item_id = incoming.provider_item_id
      where incoming.live_event_canonical_key = event_row.canonical_key
        and source_item.id = existing.source_item_id
    );

  insert into public.event_sources (
    live_event_id,
    source_item_id,
    confidence,
    field_map_jsonb
  )
  select
    event_row.id,
    source_item.id,
    coalesce(input_row.confidence, 0.5),
    coalesce(input_row.field_map_jsonb, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_payload -> 'eventSources', '[]'::jsonb)) as input_row (
    live_event_canonical_key text,
    provider text,
    provider_item_id text,
    confidence numeric,
    field_map_jsonb jsonb
  )
  join public.live_events event_row
    on event_row.canonical_key = input_row.live_event_canonical_key
  join public.source_items source_item
    on source_item.provider = input_row.provider::public.provider_kind
   and source_item.provider_item_id = input_row.provider_item_id
  on conflict (live_event_id, source_item_id) do update
  set
    confidence = excluded.confidence,
    field_map_jsonb = excluded.field_map_jsonb;
  get diagnostics event_source_count = row_count;

  with event_keys as (
    select canonical_key
    from jsonb_to_recordset(coalesce(p_payload -> 'events', '[]'::jsonb)) as event_row (
      canonical_key text
    )
  ),
  incoming_links as (
    select
      live_event_canonical_key,
      provider,
      url
    from jsonb_to_recordset(coalesce(p_payload -> 'publicLinks', '[]'::jsonb)) as link_row (
      live_event_canonical_key text,
      provider text,
      url text
    )
  )
  delete from public.public_event_links existing
  using public.live_events event_row, event_keys
  where existing.live_event_id = event_row.id
    and coalesce((p_payload ->> 'reconcileEdges')::boolean, false)
    and event_row.canonical_key = event_keys.canonical_key
    and not exists (
      select 1
      from incoming_links incoming
      where incoming.live_event_canonical_key = event_row.canonical_key
        and existing.provider = incoming.provider::public.provider_kind
        and existing.url = incoming.url
    );

  insert into public.public_event_links (
    live_event_id,
    provider,
    url,
    label,
    embeddable
  )
  select
    event_row.id,
    input_row.provider::public.provider_kind,
    input_row.url,
    input_row.label,
    coalesce(input_row.embeddable, false)
  from jsonb_to_recordset(coalesce(p_payload -> 'publicLinks', '[]'::jsonb)) as input_row (
    live_event_canonical_key text,
    provider text,
    url text,
    label text,
    embeddable boolean
  )
  join public.live_events event_row
    on event_row.canonical_key = input_row.live_event_canonical_key
  on conflict (live_event_id, provider, url) do update
  set
    label = excluded.label,
    embeddable = excluded.embeddable;
  get diagnostics public_link_count = row_count;

  if exists (
    select 1
    from (
      select run_row.adapter
      from jsonb_to_recordset(coalesce(p_payload -> 'runs', '[]'::jsonb)) as run_row (
        adapter text
      )
      group by run_row.adapter
      having count(*) > 1
    ) duplicate_runs
  ) then
    raise exception 'duplicate_run_adapter';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload -> 'providerErrors', '[]'::jsonb)) as error_row (
      run_adapter text
    )
    where not exists (
      select 1
      from jsonb_to_recordset(coalesce(p_payload -> 'runs', '[]'::jsonb)) as run_row (
        adapter text
      )
      where run_row.adapter = error_row.run_adapter
    )
  ) then
    raise exception 'provider_error_without_matching_run';
  end if;

  with run_input as (
    select *
    from jsonb_to_recordset(coalesce(p_payload -> 'runs', '[]'::jsonb)) as run_row (
      adapter text,
      status text,
      finished_at timestamptz,
      request_count integer,
      quota_cost integer,
      error_summary text
    )
  ),
  inserted_runs as (
    insert into public.ingestion_runs (
      adapter,
      status,
      finished_at,
      request_count,
      quota_cost,
      error_summary
    )
    select
      adapter::public.provider_kind,
      status::public.ingestion_status,
      finished_at,
      coalesce(request_count, 0),
      coalesce(quota_cost, 0),
      error_summary
    from run_input
    returning id, adapter
  ),
  error_input as (
    select *
    from jsonb_to_recordset(coalesce(p_payload -> 'providerErrors', '[]'::jsonb)) as error_row (
      run_adapter text,
      provider text,
      http_status integer,
      provider_code text,
      retry_after_at timestamptz,
      is_transient boolean,
      raw_excerpt text
    )
  ),
  inserted_errors as (
    insert into public.provider_errors (
      run_id,
      provider,
      http_status,
      provider_code,
      retry_after_at,
      is_transient,
      raw_excerpt
    )
    select
      inserted_runs.id,
      error_input.provider::public.provider_kind,
      error_input.http_status,
      error_input.provider_code,
      error_input.retry_after_at,
      coalesce(error_input.is_transient, false),
      left(coalesce(error_input.raw_excerpt, ''), 500)
    from error_input
    join inserted_runs
      on inserted_runs.adapter = error_input.run_adapter::public.provider_kind
    returning id
  )
  select
    (select count(*)::integer from inserted_runs),
    (select count(*)::integer from inserted_errors)
  into run_count, v_provider_error_count;

  insert into public.audit_logs (
    action,
    table_name,
    after_jsonb
  )
  values (
    'ingestion.persist',
    'live_events',
    coalesce(
      p_payload -> 'audit',
      jsonb_build_object(
        'mode', p_payload ->> 'mode',
        'eventCount', event_count,
        'sourceCount', source_count,
        'eventSourceCount', event_source_count,
        'publicLinkCount', public_link_count,
        'runCount', run_count
      )
    )
  );

  return next;
end;
$$;

create function public.purge_stale_source_items(
  p_provider public.provider_kind default 'youtube'::public.provider_kind,
  p_cutoff timestamptz default now() - interval '29 days',
  p_dry_run boolean default true
)
returns table (
  stale_source_count integer,
  detached_event_source_count integer,
  deleted_source_count integer
)
language plpgsql
set search_path = public
as $$
begin
  perform set_config('statement_timeout', '10s', true);
  perform pg_advisory_xact_lock(hashtext('oshi_command_deck_source_retention')::bigint);

  if p_cutoff > now() - interval '24 hours' then
    raise exception 'retention_cutoff_too_recent';
  end if;

  select count(*)::integer
  into stale_source_count
  from public.source_items
  where provider = p_provider
    and fetched_at < p_cutoff;

  select count(*)::integer
  into detached_event_source_count
  from public.event_sources event_source
  join public.source_items source_item on source_item.id = event_source.source_item_id
  where source_item.provider = p_provider
    and source_item.fetched_at < p_cutoff;

  if p_dry_run then
    deleted_source_count := 0;
    return next;
    return;
  end if;

  with stale_sources as (
    select id
    from public.source_items
    where provider = p_provider
      and fetched_at < p_cutoff
  ),
  deleted_edges as (
    delete from public.event_sources event_source
    using stale_sources
    where event_source.source_item_id = stale_sources.id
    returning 1
  ),
  deleted_sources as (
    delete from public.source_items source_item
    using stale_sources
    where source_item.id = stale_sources.id
    returning 1
  )
  select
    stale_source_count,
    (select count(*)::integer from deleted_edges),
    (select count(*)::integer from deleted_sources)
  into
    stale_source_count,
    detached_event_source_count,
    deleted_source_count;

  insert into public.audit_logs (
    action,
    table_name,
    after_jsonb
  )
  values (
    'source_items.retention_purge',
    'source_items',
    jsonb_build_object(
      'provider', p_provider,
      'cutoffUtc', p_cutoff,
      'staleSourceCount', stale_source_count,
      'detachedEventSourceCount', detached_event_source_count,
      'deletedSourceCount', deleted_source_count
    )
  );

  return next;
end;
$$;

create trigger creator_channels_touch
before update on public.creator_channels
for each row execute function public.touch_updated_at();

create trigger branches_touch
before update on public.branches
for each row execute function public.touch_updated_at();

create trigger creator_channels_validate_registry
before insert or update on public.creator_channels
for each row execute function public.validate_creator_channel_registry();

create trigger live_events_touch
before update on public.live_events
for each row execute function public.touch_updated_at();

create trigger push_subscriptions_touch
before update on public.push_subscriptions
for each row execute function public.touch_updated_at();

grant usage on schema public to anon, authenticated;
grant select (
  id,
  label,
  locale_hints,
  coverage,
  notes
) on public.branches to anon, authenticated;
grant select on public.public_creator_channels to anon, authenticated;
grant select on public.public_live_events to anon, authenticated;
grant select (
  id,
  provider,
  provider_channel_id,
  display_name,
  slug,
  branch,
  languages,
  tags,
  aliases,
  confidence,
  is_active
) on public.creator_channels to anon, authenticated;
grant select (
  id,
  creator_id,
  canonical_key,
  title,
  category,
  branch,
  languages,
  collaborators,
  status,
  scheduled_start_at,
  actual_start_at,
  ended_at,
  visibility,
  confidence,
  stale_after_minutes,
  conflict_ids,
  provider_error_summary,
  admin_corrected_fields,
  admin_correction_note,
  admin_corrected_at,
  is_demo,
  deleted_at,
  updated_at
) on public.live_events to anon, authenticated;
grant select (
  live_event_id,
  provider,
  url,
  label,
  embeddable
) on public.public_event_links to anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.can_admin_write() from public, anon;
grant execute on function public.can_admin_write() to authenticated;
revoke execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) from public, anon, authenticated;
grant execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) to service_role;
revoke execute on function public.persist_ingestion_run(jsonb) from public, anon, authenticated;
grant execute on function public.persist_ingestion_run(jsonb) to service_role;
revoke execute on function public.purge_stale_source_items(public.provider_kind, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.purge_stale_source_items(public.provider_kind, timestamptz, boolean) to service_role;
