-- Crear tabla para logs de conversaciones de Nancy (WhatsApp/Messenger)
create table if not exists public.conversations_log (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  contact_name text,
  contact_id text,
  channel text,
  direction text check (direction in ('inbound', 'outbound')),
  message_text text,
  message_timestamp timestamptz,
  message_type text,
  recommended_service text,
  buying_intent text,
  wants_human boolean default false,
  wants_callback boolean default false,
  created_at timestamptz not null default now()
);

-- Drop vista si existe para recrearla
drop view if exists public.conversations_summary;

-- Crear vista para resumen de conversaciones
create view public.conversations_summary as
select
  cl.conversation_id,
  cl.channel,
  cl.contact_id,
  cl.contact_name,
  cl.message_text as last_message_text,
  cl.message_timestamp as last_message_at,
  cl.direction as last_direction,
  count(*)::integer as total_messages
from public.conversations_log cl
where cl.message_timestamp = (
  select max(message_timestamp)
  from public.conversations_log
  where conversation_id = cl.conversation_id
)
group by cl.conversation_id, cl.channel, cl.contact_id, cl.contact_name, cl.message_text, cl.message_timestamp, cl.direction;

-- Políticas RLS
alter table public.conversations_log enable row level security;

create policy "Users can read conversations log"
  on public.conversations_log
  for select
  using (auth.uid() is not null);

create policy "Users can insert conversations log"
  on public.conversations_log
  for insert
  with check (auth.uid() is not null);

-- Índices para performance
create index if not exists conversations_log_conversation_id_idx
  on public.conversations_log(conversation_id);

create index if not exists conversations_log_timestamp_idx
  on public.conversations_log(message_timestamp desc);