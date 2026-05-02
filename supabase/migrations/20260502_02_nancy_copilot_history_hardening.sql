create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nancy_copilot_conversations_user_id_fkey'
      and conrelid = 'public.nancy_copilot_conversations'::regclass
  ) then
    alter table public.nancy_copilot_conversations
      add constraint nancy_copilot_conversations_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'nancy_copilot_messages_user_id_fkey'
      and conrelid = 'public.nancy_copilot_messages'::regclass
  ) then
    alter table public.nancy_copilot_messages
      add constraint nancy_copilot_messages_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

create index if not exists nancy_copilot_messages_user_created_idx
  on public.nancy_copilot_messages(user_id, created_at desc);

alter table public.nancy_copilot_conversations enable row level security;
alter table public.nancy_copilot_messages enable row level security;

drop policy if exists "Users can read their copilot conversations"
  on public.nancy_copilot_conversations;
drop policy if exists "Users can insert their copilot conversations"
  on public.nancy_copilot_conversations;
drop policy if exists "Users can update their copilot conversations"
  on public.nancy_copilot_conversations;
drop policy if exists "Users can delete their copilot conversations"
  on public.nancy_copilot_conversations;
drop policy if exists "Nancy Copilot conversations select own"
  on public.nancy_copilot_conversations;
drop policy if exists "Nancy Copilot conversations insert own"
  on public.nancy_copilot_conversations;
drop policy if exists "Nancy Copilot conversations update own"
  on public.nancy_copilot_conversations;
drop policy if exists "Nancy Copilot conversations delete own"
  on public.nancy_copilot_conversations;

drop policy if exists "Users can read their copilot messages"
  on public.nancy_copilot_messages;
drop policy if exists "Users can insert their copilot messages"
  on public.nancy_copilot_messages;
drop policy if exists "Users can update their copilot messages"
  on public.nancy_copilot_messages;
drop policy if exists "Users can delete their copilot messages"
  on public.nancy_copilot_messages;
drop policy if exists "Nancy Copilot messages select own"
  on public.nancy_copilot_messages;
drop policy if exists "Nancy Copilot messages insert own"
  on public.nancy_copilot_messages;
drop policy if exists "Nancy Copilot messages update own"
  on public.nancy_copilot_messages;
drop policy if exists "Nancy Copilot messages delete own"
  on public.nancy_copilot_messages;

create policy "Nancy Copilot conversations select own"
  on public.nancy_copilot_conversations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Nancy Copilot conversations insert own"
  on public.nancy_copilot_conversations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Nancy Copilot conversations update own"
  on public.nancy_copilot_conversations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Nancy Copilot conversations delete own"
  on public.nancy_copilot_conversations
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Nancy Copilot messages select own"
  on public.nancy_copilot_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Nancy Copilot messages insert own"
  on public.nancy_copilot_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.nancy_copilot_conversations
      where id = conversation_id
        and user_id = auth.uid()
    )
  );

create policy "Nancy Copilot messages update own"
  on public.nancy_copilot_messages
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.nancy_copilot_conversations
      where id = conversation_id
        and user_id = auth.uid()
    )
  );

create policy "Nancy Copilot messages delete own"
  on public.nancy_copilot_messages
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.update_nancy_copilot_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_nancy_copilot_conversation_updated_at
  on public.nancy_copilot_conversations;

create trigger set_nancy_copilot_conversation_updated_at
  before update on public.nancy_copilot_conversations
  for each row
  execute function public.update_nancy_copilot_conversation_updated_at();

create or replace function public.touch_nancy_copilot_conversation_from_message()
returns trigger
language plpgsql
as $$
begin
  update public.nancy_copilot_conversations
  set updated_at = now()
  where id = new.conversation_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists touch_nancy_copilot_conversation_after_message_insert
  on public.nancy_copilot_messages;

create trigger touch_nancy_copilot_conversation_after_message_insert
  after insert on public.nancy_copilot_messages
  for each row
  execute function public.touch_nancy_copilot_conversation_from_message();
