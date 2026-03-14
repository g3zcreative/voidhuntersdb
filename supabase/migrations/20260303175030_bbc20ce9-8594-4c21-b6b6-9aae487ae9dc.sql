ALTER TABLE public.official_posts
  ADD COLUMN channel_name text,
  ADD COLUMN message_url text,
  ADD COLUMN discord_message_id text UNIQUE;