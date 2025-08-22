-- === TABELA CZATU ===
create table if not exists public.messages (
  id         bigserial primary key,
  username   text not null default 'Anon',
  text       text not null,
  created_at timestamptz not null default now()
);

-- Indeks do szybkiego sortowania po dacie
create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

-- === RLS (Row Level Security) ===
alter table public.messages enable row level security;

-- publiczny ODCZYT (dla ról anon i authenticated)
drop policy if exists "public read" on public.messages;
create policy "public read"
  on public.messages for select
  using ( true );

-- publiczny ZAPIS (dla ról anon i authenticated)
drop policy if exists "public insert" on public.messages;
create policy "public insert"
  on public.messages for insert
  with check ( true );

-- (Opcjonalnie) usuń bardzo stare wiadomości automatycznie – np. po 90 dniach
-- create extension if not exists pg_cron;
-- select cron.schedule('purge_old_messages',
--   '0 3 * * *',  -- codziennie 03:00
--   $$ delete from public.messages where created_at < now() - interval '90 days' $$);

-- === Realtime: włącz strumień zmian dla tabeli messages ===
-- (To samo co w UI „Włącz w czasie rzeczywistym”)
create publication if not exists supabase_realtime; 
alter publication supabase_realtime add table public.messages;
