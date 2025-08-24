-- ===========================================================
-- ARKON • minimalny backend (CZAT + uploady do Storage)
-- Uruchom w SQL Editor. Zalecana rola: postgres/supabase_admin
-- ===========================================================

-- 0) rozszerzenia
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1) helper do aktualizacji updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- 2) Tabela wiadomości czatu
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     text        not null,              -- np. 'global', 'adrian', 'krolowa'
  author      text        not null,              -- podpis wyświetlany w UI
  body        text,                              
  file_url    text,                              -- publiczny URL pliku (jeśli jest)
  parent_id   uuid references public.messages(id) on delete set null, -- wątki
  reactions   jsonb default '{}'::jsonb,         -- {"👍":2,"❤":1}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz
);

-- indeksy pod listy/powiadomienia
create index if not exists idx_msg_room_time on public.messages (room_id, created_at);
create index if not exists idx_msg_parent     on public.messages (parent_id);
create index if not exists idx_msg_has_file   on public.messages ((file_url is not null));

-- trigger aktualizujący updated_at
drop trigger if exists trg_messages_upd on public.messages;
create trigger trg_messages_upd
before update on public.messages
for each row execute procedure public.set_updated_at();

-- 3) RLS (pozwalamy czytać i wysyłać wszystkim – BEZ logowania)
alter table public.messages enable row level security;

-- SELECT – każdy może czytać
drop policy if exists msg_public_select on public.messages;
create policy msg_public_select
on public.messages
for select
to public
using (true);

-- INSERT – każdy może dodać (UI i tak filtruje wartości)
drop policy if exists msg_public_insert on public.messages;
create policy msg_public_insert
on public.messages
for insert
to public
with check (true);

-- UPDATE/DELETE – domyślnie blokujemy (brak auth – nie ma „właściciela”)
-- Jeśli chcesz dopuścić edycję/kasowanie, dodaj osobne polityki z auth.

-- 4) Realtime (Supabase włącza na schemacie public). Nic nie trzeba robić,
-- ale upewnij się, że projekt ma włączony Realtime dla tabeli messages.

-- 5) Storage – kubełek na pliki z czatu
insert into storage.buckets (id, name, public)
values ('chat','chat', true)
on conflict (id) do nothing;

-- 5a) Polityki do odczytu/zapisu w kubełku chat
-- UWAGA: musisz być właścicielem tabeli storage.objects (rola postgres/supabase_admin).
-- Jeżeli polityki już istnieją, te CREATE po prostu je pominą.

-- włącz RLS (zwykle jest włączone)
alter table if exists storage.objects enable row level security;

-- czytanie publiczne (wszyscy)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='chat_public_read'
  ) then
    create policy chat_public_read
      on storage.objects
      for select
      using (bucket_id = 'chat');
  end if;
end$$;

-- dodawanie plików (wszyscy) – ograniczamy tylko do kubełka chat
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='chat_public_insert'
  ) then
    create policy chat_public_insert
      on storage.objects
      for insert
      with check (bucket_id = 'chat');
  end if;
end$$;

-- (opcjonalnie) blokuj UPDATE/DELETE – nic nie robimy = domyślnie zabronione.

-- 6) szybkie sanity checki (możesz uruchomić osobno)
-- select * from storage.buckets where id='chat';
-- select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'chat_%' order by policyname;
-- select * from public.messages order by created_at desc limit 3;
