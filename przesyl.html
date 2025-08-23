<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARKON — Umowy (upload + chmura)</title>

<!-- Supabase (CDN) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<style>
  :root{
    --bg:#0b1020;--p1:#0f1533;--p2:#121a38;--ink:#e7ecff;--muted:#aeb8da;--line:#223066;
    --ok:#2fbf71;--bad:#ff6b6b;--warn:#ffb84d;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{background:linear-gradient(180deg,#0a0f1e,#0c1230 60%,#0a0f1e);color:var(--ink);font:15px/1.5 system-ui,Segoe UI,Roboto,Arial}
  .wrap{max-width:1100px;margin:auto;padding:18px}
  h1{margin:0 0 8px;font-size:22px}
  .card{background:linear-gradient(180deg,var(--p1),var(--p2));border:1px solid var(--line);border-radius:14px;padding:14px;margin:10px 0}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .btn{background:#233261;border:1px solid #3a4ca3;color:#fff;border-radius:10px;padding:8px 12px;cursor:pointer}
  .btn.ghost{background:transparent;border:1px dashed #3a4ca3}
  .pill{display:inline-block;border:1px dashed #2b3a77;background:#0d1530;border-radius:999px;padding:6px 10px;color:#aeb8da}
  input,select{background:#0e1330;border:1px solid #28356c;border-radius:10px;padding:8px 10px;color:var(--ink);font:inherit}
  .small{font-size:12px;color:#aeb8da}
  .table{width:100%;border-collapse:separate;border-spacing:0}
  .table th,.table td{padding:9px;border-bottom:1px solid #22325f;text-align:left;vertical-align:top}
  .scroll{max-height:380px;overflow:auto}
  .drop{border:2px dashed #2a3777;border-radius:10px;padding:22px;text-align:center;cursor:pointer;background:#0c1230}
  .drop.drag{background:#10183b}
  #cloudState.ok{border-color:#2e925e;background:#0f2c22}
  #cloudState.bad{border-color:#7b3341;background:#2e1117}
  #flash{color:var(--warn)}
</style>
</head>
<body>
<div class="wrap">
  <h1>Umowy — upload lokalny + Supabase</h1>
  <div class="small">Ta strona zapisuje pliki w IndexedDB i (opcjonalnie) wysyła je do bucketa <b>umowy</b> w Supabase.</div>

  <div class="card">
    <div class="row">
      <select id="selClient" title="Klient" style="min-width:260px">
        <option value="">(bez przypisania)</option>
      </select>
      <select id="selCat">
        <option>Umowa z firmą</option>
        <option>Audyt</option>
        <option>Dokument do audytu Czyste Powietrze</option>
        <option>Audyt rozprowadzenia instalacji</option>
        <option>Faktura za prąd</option>
        <option>Oferta (PDF)</option>
        <option>Inne</option>
      </select>
      <input id="tags" placeholder="tagi, przecinkami">
      <label class="btn">Dodaj pliki… <input id="inFiles" type="file" multiple hidden></label>

      <label class="pill" style="cursor:pointer">
        <input id="toCloud" type="checkbox" checked> Wyślij do chmury
      </label>
      <span id="cloudState" class="pill">Chmura: sprawdzanie…</span>
      <button id="btnRefresh" class="btn ghost">Odśwież</button>
      <span id="flash" class="small"></span>
    </div>

    <div id="drop" class="drop" style="margin-top:10px">Upuść pliki tutaj lub kliknij „Dodaj pliki…”</div>
  </div>

  <div class="card">
    <div class="row" style="margin-bottom:6px">
      <input id="qFiles" placeholder="🔎 filtr: nazwa/typ/kategoria/tag/klient…" style="min-width:260px">
      <select id="fCat"><option value="">Kategoria (wszystkie)</option></select>
      <button id="btnClear" class="btn ghost">Wyczyść filtr</button>
      <span class="pill">Widocznych: <b id="filesVis">0</b></span>
    </div>
    <div class="scroll">
      <table class="table">
        <thead><tr>
          <th>Akcje</th><th>Nazwa</th><th>Klient</th><th>Kategoria</th><th>Tagi</th><th>Typ</th><th>Rozmiar</th><th>Data</th>
        </tr></thead>
        <tbody id="tbFiles"></tbody>
      </table>
    </div>
  </div>
</div>

<script>
'use strict';

/* ======= helpers ======= */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const INT0=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0});
const bytes=n=>n<1024? n+' B' : n<1048576? (n/1024).toFixed(1)+' KB' : n<1073741824? (n/1048576).toFixed(1)+' MB' : (n/1073741824).toFixed(1)+' GB';
const uid=()=> 'ID_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
function esc(s){return (s||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function flash(msg, isErr){ const el=$('#flash'); if(!el) return; el.textContent=msg||''; el.style.color=isErr?'#ff6b6b':'#ffb84d'; setTimeout(()=>el.textContent='',3500); }

/* ======= mock: klienci z localStorage (zgodne z Twoimi stronami) ======= */
function loadClients(){
  let a=[];
  try{ a = JSON.parse(localStorage.getItem('arkon_clients_v1')||'[]'); }catch{}
  if(!Array.isArray(a)||!a.length){ try{ a = JSON.parse(localStorage.getItem('arkon_clients_v2')||'[]'); }catch{} }
  return Array.isArray(a)?a:[];
}
function fillClients(){
  const el = $('#selClient'); if(!el) return;
  const arr = loadClients();
  el.innerHTML = '<option value="">(bez przypisania)</option>' + arr.map(c=><option value="${c.id}">${esc(c.name||'')}</option>).join('');
}

/* ======= IndexedDB: files ======= */
let db;
function dbOpen(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open('arkonCRM_local',2);
    r.onupgradeneeded=()=>{const d=r.result; if(!d.objectStoreNames.contains('files')) d.createObjectStore('files',{keyPath:'id'});};
    r.onsuccess=()=>{db=r.result; res();};
    r.onerror=()=>rej(r.error);
  });
}
function dbPut(o){return new Promise((res,rej)=>{const tx=db.transaction('files','readwrite'); tx.objectStore('files').put(o); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);});}
function dbGet(id){return new Promise((res,rej)=>{const tx=db.transaction('files','readonly'); const rq=tx.objectStore('files').get(id); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);});}
function dbAll(){return new Promise((res,rej)=>{const tx=db.transaction('files','readonly'); const rq=tx.objectStore('files').getAll(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>rej(rq.error);});}
function dbDel(id){return new Promise((res,rej)=>{const tx=db.transaction('files','readwrite'); tx.objectStore('files').delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);});}

/* ======= Supabase ======= */
const SUPA_URL = 'https://phxxjirqlktzcwnygaha.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoeHhqaXJxbGt0emN3bnlnYWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjAxODgsImV4cCI6MjA3MTQzNjE4OH0.tUjENk3OgBM1bHcnBm_QCFn17fwYn2N6uVp6Yf2PsJQ'; // public anon
const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
const BUCKET = 'umowy';
const ACCOUNT_ID = (localStorage.getItem('arkon_account_id') || 'arkon-crm').toLowerCase();

function setCloudState(t, ok){ const el=$('#cloudState'); if(!el) return; el.textContent=t; el.classList.remove('ok','bad'); el.classList.add(ok?'ok':'bad'); }
async function supaPing(){
  try{
    const { error } = await supa.storage.from(BUCKET).list('upload', { limit: 1 });
    if(error) throw error;
    setCloudState('Chmura: połączono ✓', true);
  }catch(e){ setCloudState('Chmura: błąd (bucket/polityki)', false); console.warn('Supabase ping error', e); }
}
const safeName = n => String(n||'plik').normalize('NFKD').replace(/[^\w.\-]+/g,'').replace(/+/g,'_').toLowerCase();
function buildPath({clientId,file}){
  const who=(clientId||'bez-klienta').toLowerCase();
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  return upload/${who}/${ts}_${safeName(file.name)};
}
async function uploadToSupabase({file, clientId, clientName, category, tags}){
  const path = buildPath({clientId,file});
  const { error:upErr } = await supa.storage.from(BUCKET).upload(path,file,{ upsert:true, cacheControl:'3600', contentType:file.type||'application/octet-stream' });
  if(upErr) throw upErr;
  const { data:pub } = supa.storage.from(BUCKET).getPublicUrl(path);
  const file_url = pub?.publicUrl || null;
  // opcjonalne metadane (zignoruje błąd jeśli nie masz tabeli)
  try{
    await supa.from('files').insert({
      account_id:ACCOUNT_ID, client_id:clientId||'', client_name:clientName||'',
      category:category||'', tags:tags||'', file_name:file.name, file_path:path,
      file_url, author:ACCOUNT_ID, uploaded_at:new Date().toISOString()
    });
  }catch(_){}
  return { path, file_url };
}

/* ======= UI: lista plików ======= */
let fileFilter={q:'',cat:''};
const fmt = n => isFinite(n)? INT0.format(Math.round(n)) : '—';

async function renderFiles(){
  const list = await dbAll();
  const q=(fileFilter.q||'').toLowerCase(), cat=fileFilter.cat||'';
  const tb=$('#tbFiles'); tb.innerHTML='';
  const cats=new Set(); list.forEach(r=>cats.add(r.category||''));
  $('#fCat').innerHTML = '<option value="">Kategoria (wszystkie)</option>' + Array.from(cats).filter(Boolean).map(c=><option ${cat===c?'selected':''}>${esc(c)}</option>).join('');
  let vis=0;
  list.sort((a,b)=>(b.at||0)-(a.at||0)).filter(x=>{
    if(cat && (x.category||'')!==cat) return false;
    const hay=[x.name,x.clientName,x.category,x.type,x.tags].join(' ').toLowerCase();
    return !q || hay.includes(q);
  }).forEach(rec=>{
    vis++;
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td class="row">
        <button class="btn ghost" data-dl="${rec.id}">Pobierz</button>
        <button class="btn" data-edit="${rec.id}">Edytuj</button>
        <button class="btn bad" data-del="${rec.id}">Usuń</button>
      </td>
      <td>${esc(rec.name)}</td>
      <td>${esc(rec.clientName||'')}</td>
      <td>${esc(rec.category||'')}</td>
      <td>${esc(rec.tags||'')}</td>
      <td>${esc(rec.type||'')}</td>
      <td>${bytes(rec.size||0)}</td>
      <td>${new Date(rec.at).toLocaleString('pl-PL')}</td>`;
    tb.appendChild(tr);
  });
  $('#filesVis').textContent=vis;

  tb.querySelectorAll('[data-dl]').forEach(b=>b.addEventListener('click', async ()=>{
    const rec=await dbGet(b.dataset.dl); if(!rec){ alert('Plik niedostępny.'); return; }
    const url=URL.createObjectURL(rec.blob); const a=document.createElement('a'); a.href=url; a.download=rec.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  }));
  tb.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!confirm('Usunąć plik?')) return; await dbDel(b.dataset.del); renderFiles();
  }));
  tb.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', async ()=>{
    const rec=await dbGet(b.dataset.edit); if(!rec) return;
    const name=prompt('Nowa nazwa', rec.name)||rec.name;
    const category=prompt('Kategoria', rec.category||'')||rec.category||'';
    const tags=prompt('Tagi (przecinkami)', rec.tags||'')||rec.tags||'';
    const clientId=prompt('ID klienta (puste = bez przypisania)', rec.clientId||'')||'';
    const clientName=clientId?(loadClients().find(c=>c.id===clientId)?.name||''):'';
    await dbPut({...rec,name,category,tags,clientId,clientName}); renderFiles();
  }));
}

/* ======= upload handler ======= */
async function handleFiles(files){
  if(!files || !files.length){ flash('Nie wybrano plików', true); return; }
  const clientId=$('#selClient').value||'';
  const clientName = clientId ? (loadClients().find(c=>c.id===clientId)?.name||'') : '';
  const category=$('#selCat').value||'Inne';
  const tags=$('#tags').value||'';
  const toCloud=$('#toCloud').checked;

  for(const f of Array.from(files)){
    const id=uid();
    await dbPut({ id, name:f.name, type:f.type||'application/octet-stream', size:f.size, blob:f, at:Date.now(),
      category, clientId, clientName, origin:'upload', tags });
    if(toCloud){
      try{
        const { file_url } = await uploadToSupabase({ file:f, clientId, clientName, category, tags });
        console.log('Cloud OK:', file_url);
        setCloudState('Chmura: wysłano ✓', true);
      }catch(e){
        console.error('Cloud error', e);
        setCloudState('Chmura: błąd wysyłki', false);
        flash('Błąd wysyłki do chmury (sprawdź polityki bucketu).', true);
      }
    }
  }
  renderFiles();
  flash('Dodano pliki.');
}

/* ======= drag & drop ======= */
(function setupDnD(){
  const box = $('#drop'); if(!box) return;
  const on = e=>{ e.preventDefault(); e.stopPropagation(); };
  ['dragenter','dragover','dragleave','drop'].forEach(ev=>box.addEventListener(ev,on,false));
  ['dragenter','dragover'].forEach(ev=>box.addEventListener(ev,()=>box.classList.add('drag'),false));
  ;['dragleave','drop'].forEach(ev=>box.addEventListener(ev,()=>box.classList.remove('drag'),false));
  box.addEventListener('drop',e=>{ const fs=e.dataTransfer.files; if(fs?.length) handleFiles(fs); });
  box.addEventListener('click',()=>$('#inFiles').click());
})();

/* ======= INIT ======= */
(async function init(){
  try{ await dbOpen(); }catch(e){ console.error('IndexedDB error', e); flash('IndexedDB nie działa (uruchom przez http://).', true); }
  fillClients();
  supaPing();

  $('#inFiles').addEventListener('change', e=>{ handleFiles(e.target.files); e.target.value=''; });
  $('#btnRefresh').addEventListener('click', renderFiles);
  $('#qFiles').addEventListener('input', e=>{ fileFilter.q=e.target.value.trim(); renderFiles(); });
  $('#btnClear').addEventListener('click', ()=>{ fileFilter={q:'',cat:''}; $('#qFiles').value=''; $('#fCat').value=''; renderFiles(); });
  $('#fCat').addEventListener('change', e=>{ fileFilter.cat=e.target.value||''; renderFiles(); });

  renderFiles();
})();
</script>
</body>
</html>