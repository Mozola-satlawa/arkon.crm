<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ARKON CRM — Notatki (SQL / RLS)</title>
  <style>
    :root{
      --bg:#0b1020;--card:#0f1636;--line:#263168;--accent:#3a6df0;
      --text:#e7ecff;--muted:#a3b3ff;
    }
    *{box-sizing:border-box}
    html,body{margin:0;height:100%}
    body{font:15px/1.5 system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--text)}
    a{color:#cfe0ff;text-decoration:none}
    .container{max-width:960px;margin:0 auto;padding:16px}
    nav{position:sticky;top:0;background:rgba(11,16,32,.85);backdrop-filter:blur(6px);border-bottom:1px solid var(--line)}
    .nav-inner{display:flex;gap:12px;align-items:center;padding:12px 16px}
    .brand{font-weight:700}
    .chip{display:inline-block;padding:4px 8px;border-radius:999px;background:#1a244d}
    .card{background:#0f1636;border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:16px}
    pre{white-space:pre-wrap;word-break:break-word;background:#0d1330;border:1px solid var(--line);border-radius:8px;padding:12px}
    .muted{color:var(--muted)}
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <div class="brand">ARKON CRM</div>
      <a href="index.html" class="chip">🏠 Strona główna</a>
      <a href="notes.html" class="chip">📒 Notatki (SQL / RLS)</a>
    </div>
  </nav>

  <div class="container">
    <h1>Notatki projektowe: Supabase (tabela czatu + RLS)</h1>

    <div class="card">
      <h2>SQL — tworzenie tabeli <code>public.messages</code></h2>
      <pre>
create table if not exists public.messages (
  id bigserial primary key,
  username text not null default 'Anon',
  text text not null,
  created_at timestamp with time zone not null default now()
);

-- indeks po dacie (szybkie sortowanie)
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- RLS
alter table public.messages enable row level security;

-- Zasady: publiczny odczyt / publiczny zapis (dla roli 'anon' i 'authenticated')
drop policy if exists "public read" on public.messages;
create policy "public read"  on public.messages for select using (true);

drop policy if exists "public insert" on public.messages;
create policy "public insert" on public.messages for insert with check (true);
      </pre>
      <p class="muted">Uwaga: powyższe zasady otwierają czat dla wszystkich (jak tablica ogłoszeń).  
      Docelowo możesz ograniczyć je do zalogowanych użytkowników.</p>
    </div>

    <div class="card">
      <h2>Wróć do strony głównej</h2>
      <p><a href="index.html">← index.html</a></p>
    </div>
  </div>
</body>
</html>
