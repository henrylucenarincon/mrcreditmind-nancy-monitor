create extension if not exists pgcrypto;

create table if not exists public.internal_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'readonly',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_user_profiles_role_check'
      and conrelid = 'public.internal_user_profiles'::regclass
  ) then
    alter table public.internal_user_profiles
      add constraint internal_user_profiles_role_check
      check (role in ('admin', 'manager', 'ops', 'sales', 'readonly'));
  end if;
end $$;

create index if not exists internal_user_profiles_role_active_idx
  on public.internal_user_profiles(role, is_active);

create or replace function public.update_internal_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_internal_user_profiles_updated_at
  on public.internal_user_profiles;

create trigger set_internal_user_profiles_updated_at
  before update on public.internal_user_profiles
  for each row
  execute function public.update_internal_user_profiles_updated_at();

alter table public.internal_user_profiles enable row level security;

create or replace function public.is_internal_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.internal_user_profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function public.is_internal_admin() from public;
grant execute on function public.is_internal_admin() to authenticated;

drop policy if exists "Internal user profiles select own or admin"
  on public.internal_user_profiles;

create policy "Internal user profiles select own or admin"
  on public.internal_user_profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or public.is_internal_admin()
  );

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_log_actor_created_idx
  on public.security_audit_log(actor_user_id, created_at desc);

create index if not exists security_audit_log_action_created_idx
  on public.security_audit_log(action, created_at desc);

alter table public.security_audit_log enable row level security;

comment on table public.internal_user_profiles is
  'Internal Nancy user roles. Managed server-side/admin-side only.';

comment on table public.security_audit_log is
  'Append-only security audit events. No direct client policies in the base hardening phase.';
