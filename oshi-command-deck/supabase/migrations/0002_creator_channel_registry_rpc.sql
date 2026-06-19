create function public.upsert_creator_channel_registry(
  p_provider public.provider_kind,
  p_provider_channel_id text,
  p_display_name text,
  p_slug text,
  p_branch text,
  p_languages text[] default '{}',
  p_tags text[] default '{}',
  p_aliases text[] default '{}',
  p_confidence numeric default 0.5,
  p_is_active boolean default true,
  p_admin_actor text default 'admin-token',
  p_admin_user_id uuid default null,
  p_ip inet default null,
  p_user_agent text default null
)
returns table (
  id uuid,
  provider public.provider_kind,
  provider_channel_id text,
  display_name text,
  slug text,
  branch text,
  languages text[],
  tags text[],
  aliases text[],
  confidence numeric,
  is_active boolean,
  updated_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_channel public.creator_channels%rowtype;
begin
  perform set_config('statement_timeout', '10s', true);

  insert into public.creator_channels (
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
  )
  values (
    p_provider,
    trim(p_provider_channel_id),
    trim(p_display_name),
    trim(p_slug),
    trim(p_branch),
    coalesce(p_languages, '{}'),
    coalesce(p_tags, '{}'),
    coalesce(p_aliases, '{}'),
    p_confidence,
    p_is_active
  )
  on conflict (provider, provider_channel_id) do update
  set
    display_name = excluded.display_name,
    slug = excluded.slug,
    branch = excluded.branch,
    languages = excluded.languages,
    tags = excluded.tags,
    aliases = excluded.aliases,
    confidence = excluded.confidence,
    is_active = excluded.is_active
  returning * into v_channel;

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
    'creator_channels.upsert',
    'creator_channels',
    v_channel.id,
    jsonb_build_object(
      'provider', v_channel.provider,
      'providerChannelId', v_channel.provider_channel_id,
      'displayName', v_channel.display_name,
      'slug', v_channel.slug,
      'branch', v_channel.branch,
      'languages', v_channel.languages,
      'tags', v_channel.tags,
      'aliases', v_channel.aliases,
      'confidence', v_channel.confidence,
      'isActive', v_channel.is_active,
      'actor', p_admin_actor
    ),
    p_ip,
    p_user_agent
  );

  return query
  select
    v_channel.id,
    v_channel.provider,
    v_channel.provider_channel_id,
    v_channel.display_name,
    v_channel.slug,
    v_channel.branch,
    v_channel.languages,
    v_channel.tags,
    v_channel.aliases,
    v_channel.confidence,
    v_channel.is_active,
    v_channel.updated_at;
end;
$$;

revoke execute on function public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text) from public, anon, authenticated;

grant execute on function public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text) to service_role;
