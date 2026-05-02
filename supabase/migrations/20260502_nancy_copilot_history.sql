create table if not exists public.nancy_copilot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Nueva conversacion',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nancy_copilot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.nancy_copilot_conversations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nancy_copilot_conversations_user_updated_idx
  on public.nancy_copilot_conversations(user_id, updated_at desc);

create index if not exists nancy_copilot_messages_conversation_created_idx
  on public.nancy_copilot_messages(conversation_id, created_at asc);

alter table public.nancy_copilot_conversations enable row level security;
alter table public.nancy_copilot_messages enable row level security;

create policy "Users can read their copilot conversations"
  on public.nancy_copilot_conversations
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their copilot conversations"
  on public.nancy_copilot_conversations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their copilot conversations"
  on public.nancy_copilot_conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their copilot messages"
  on public.nancy_copilot_messages
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their copilot messages"
  on public.nancy_copilot_messages
  for insert
  with check (auth.uid() = user_id);
