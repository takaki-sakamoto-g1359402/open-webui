insert into public.creator_channels
  (provider, provider_channel_id, display_name, slug, branch, languages, tags, aliases, confidence, is_active)
values
  ('youtube', 'DEMO_YT_KUZUHA', 'Kuzuha', 'kuzuha', 'jp', '{ja}', '{game,collaboration}', '{葛葉}', 0.84, true),
  ('youtube', 'DEMO_YT_MITO', 'Tsukino Mito', 'tsukino-mito', 'jp', '{ja}', '{chat,event}', '{月ノ美兎}', 0.82, true),
  ('youtube', 'DEMO_YT_ELIRA', 'Elira Pendora', 'elira-pendora', 'en', '{en,ja}', '{game,music}', '{}', 0.80, true)
on conflict do nothing;

insert into public.live_events
  (creator_id, canonical_key, title, category, branch, languages, collaborators, status, scheduled_start_at, visibility, confidence, is_demo)
values
  ((select id from public.creator_channels where provider = 'youtube' and slug = 'kuzuha'), 'youtube:DEMO_LIVE_MINECRAFT_KUZUHA', '【Minecraft】夜の建築と素材集め with friends', 'minecraft', 'jp', '{ja}', '{"Elira Pendora","Manual POV"}', 'live', now() - interval '36 minutes', 'public', 0.91, true),
  ((select id from public.creator_channels where provider = 'youtube' and slug = 'elira-pendora'), 'youtube:DEMO_SCHEDULED_COLLAB_ELIRA', 'Minecraft relay POV / exploring the new town', 'minecraft', 'en', '{en,ja}', '{Kuzuha,"Manual POV"}', 'scheduled', now() + interval '92 minutes', 'public', 0.86, true),
  ((select id from public.creator_channels where provider = 'youtube' and slug = 'tsukino-mito'), 'manual:DEMO_MANUAL_CHAT_MITO', '雑談: 今週の予定を整理する配信', 'chat', 'jp', '{ja}', '{}', 'scheduled', now() + interval '210 minutes', 'unknown', 0.68, true)
on conflict do nothing;
