/* upload.js — ARKON (IndexedDB + Netlify Blobs) */
(() => {
  'use strict';

  // ===== helpers =====
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const INT0 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
  const fmt  = n => isFinite(n)? INT0.format(Math.round(n)) : '—';
  const bytes=n=>n<1024? n+' B' : n<1048576? (n/1024).toFixed(1)+' KB' : n<1073741824? (n/1048576).toFixed(1)+' MB' : (n/1073741824).toFixed(1)+' GB';
  const uid  = () => 'ID_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
  const esc  = s => (s||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const debounce = (fn,ms)=>{let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),ms||180);}};

  // ===== clients =====
  function loadClients(){
    let a=[];
    try{ a = JSON.parse(localStorage.getItem('arkon_clients_v1')||'[]'); }catch{}
    if(!Array.isArray(a) || !a.length){
      try{ a = JSON.parse(localStorage.getItem('arkon_clients_v2')||'[]'); }catch{}
    }
    return Array.isArray(a)?a:[];
  }
  function fillClients(ids){
    const clients = loadClients();
    ids.forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.innerHTML = '<option value="">(bez przypisania)</option>' +
        clients.map(c=><option value="${c.id}">${esc(c.name||'')}</option>).join('');
    });
  }

  // ===== IndexedDB =====
  let db;
  function dbOpen(){
    return new Promise((res,rej)=>{
      const r = indexedDB.open('arkonCRM_local',2);
      r.onupgradeneeded=()=>{const d=r.result; if(!d.objectStoreNames.contains('files')) d.createObjectStore('files',{keyPath:'id'});};
      r.onsuccess=()=>{db=r.result; res();};
      r.onerror =()=>rej(r.error);
    });
  }
  const dbPut = o=> new Promise((res,rej)=>{const tx=db.transaction('files','readwrite'); tx.objectStore('files').put(o); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);});
  const dbGet = id=> new Promise((res,rej)=>{const tx=db.transaction('files','readonly'); const rq=tx.objectStore('files').get(id); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);});
  const dbAll = ()=> new Promise((res,rej)=>{const tx=db.transaction('files','readonly'); const rq=tx.objectStore('files').getAll(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>rej(rq.error);});
  const dbDel = id=> new Promise((res,rej)=>{const tx=db.transaction('files','readwrite'); tx.objectStore('files').delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);});

  // ===== Netlify Blobs =====
  const BLOB_URL = '/.netlify/blobs'; // działa tylko na stronie serwowanej przez Netlify
  function safeName(name){
    return String(name||'plik')
      .normalize('NFKD')
      .replace(/[^\w.\-]+/g,'_')
      .replace(/+/g,'')
      .toLowerCase();
  }
  function buildPath({clientId,file}){
    const who = (clientId||'bez-klienta').toLowerCase();
    const ts  = new Date().toISOString().replace(/[:.]/g,'-');
    return upload/${who}/${ts}_${safeName(file.name)};
  }
  async function blobsPing(){
    const el = $('#cloudState');
    try{
      const r = await fetch(BLOB_URL, { method:'OPTIONS' });
      if(!r.ok) throw new Error('HTTP '+r.status);
      el.textContent = 'Chmura: gotowe ✓ (Netlify Blobs)';
      el.style.borderColor = '#2e925e'; el.style.background = '#0f2c22';
      return true;
    }catch(e){
      el.textContent = 'Chmura: niedostępna (Blobs off?)';
      el.style.borderColor = '#7b3341'; el.style.background = '#2e1117';
      console.warn('Blobs ping error:', e);
      return false;
    }
  }
  async function uploadToBlobs({file, clientId, clientName, category, tags}){
    const path = buildPath({clientId,file});
    const r = await fetch(BLOB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Blob-Path': path,
        'X-Blob-Meta-Client-Id': clientId || '',
        'X-Blob-Meta-Client-Name': clientName || '',
        'X-Blob-Meta-Category': category || '',
        'X-Blob-Meta-Tags': tags || ''
      },
      body: file
    });
    if(!r.ok){
      const t = await r.text().catch(()=> '');
      throw new Error(Blobs ${r.status} ${r.statusText} : ${t.slice(0,200)});
    }
    const data = await r.json().catch(()=> ({}));
    return { path, url: data?.url || null };
  }

  // ===== UI: pliki =====
  let fileFilter={q:'',cat:''};

  async function handleFiles(files){
    const clientId   = $('#selClient').value || '';
    const clientName = clientId ? (loadClients().find(c=>c.id===clientId)?.name||'') : '';
    const category   = $('#selCat').value || 'Inne';
    const tags       = $('#tags').value || '';
    const toCloud    = !!$('#toCloud')?.checked;

    for(const f of Array.from(files||[])){
      const id=uid();
      // lokalnie
      await dbPut({ id, name:f.name, type:f.type||'application/octet-stream', size:f.size, blob:f, at:Date.now(),
        category, clientId, clientName, origin:'upload', tags });

      // chmura
      if(toCloud){
        try{
          const { url } = await uploadToBlobs({ file:f, clientId, clientName, category, tags });
          console.log('Uploaded to blobs:', url);
          $('#cloudState').textContent = 'Chmura: wysłano ✓';
          $('#cloudState').style.borderColor = '#2e925e'; $('#cloudState').style.background = '#0f2c22';
        }catch(e){
          console.error('Cloud upload error:', e);
          $('#cloudState').textContent = 'Chmura: błąd wysyłki';
          $('#cloudState').style.borderColor = '#7b3341'; $('#cloudState').style.background = '#2e1117';
          alert('Błąd wysyłki do chmury: '+e.message);
        }
      }
    }
    renderFiles();
  }

  async function renderFiles(){
    const list = await dbAll();
    const q=(fileFilter.q||'').toLowerCase();
    const cat = fileFilter.cat||'';
    const tb = $('#tbFiles'); tb.innerHTML='';
    const cats = new Set();
    list.sort((a,b)=>(b.at||0)-(a.at||0)).forEach(rec=>cats.add(rec.category||''));
    $('#fCat').innerHTML = '<option value="">Kategoria (wszystkie)</option>' +
      Array.from(cats).filter(Boolean).map(c=><option ${cat===c?'selected':''}>${esc(c)}</option>).join('');
    let vis=0;
    list.filter(x=>{
      if(cat && (x.category||'')!==cat) return false;
      const hay=[x.name,x.clientName,x.category,x.type,x.tags].join(' ').toLowerCase();
      return !q || hay.includes(q);
    }).forEach(rec=>{
      vis++;
      const tr=document.createElement('tr');
      const when=rec.at? new Date(rec.at).toLocaleString('pl-PL'):'';
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
        <td>${when}</td>`;
      tb.appendChild(tr);
    });
    $('#filesVis').textContent = vis;

    tb.querySelectorAll('[data-dl]').forEach(b=>b.addEventListener('click', async ()=>{
      const rec=await dbGet(b.dataset.dl); if(!rec){ alert('Plik niedostępny.'); return; }
      const url=URL.createObjectURL(rec.blob); const a=document.createElement('a'); a.href=url; a.download=rec.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
    }));
    tb.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
      if(!confirm('Usunąć plik?')) return; await dbDel(b.dataset.del); renderFiles();
    }));
    tb.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', async ()=>{
      const rec=await dbGet(b.dataset.edit); if(!rec){ alert('Brak pliku.'); return; }
      const newName = prompt('Nowa nazwa pliku', rec.name) || rec.name;
      const newCat = prompt('Kategoria', rec.category||'') || rec.category||'';
      const newTags = prompt('Tagi (przecinkami)', rec.tags||'') || rec.tags||'';
      const clientId = prompt('ID klienta (puste = bez przypisania)', rec.clientId||'') || '';
      const clientName = clientId ? (loadClients().find(c=>c.id===clientId)?.name||'') : '';
      await dbPut({...rec, name:newName, category:newCat, tags:newTags, clientId, clientName });
      renderFiles();
    }));
  }

  // ===== init =====
  (async function init(){
    await dbOpen();
    fillClients(['selClient','offClient','flyClient']);
    $('#inFiles')?.addEventListener('change',e=>{ handleFiles(e.target.files); e.target.value=''; });
    $('#btnRefresh')?.addEventListener('click',renderFiles);
    $('#qFiles')?.addEventListener('input', e=>{ fileFilter.q=e.target.value.trim(); renderFiles(); });
    $('#btnClear')?.addEventListener('click',()=>{ fileFilter={q:'',cat:''}; $('#qFiles').value=''; $('#fCat').value=''; renderFiles(); });
    $('#fCat')?.addEventListener('change', e=>{ fileFilter.cat=e.target.value||''; renderFiles(); });

    await blobsPing(); // pokaże „Chmura: gotowe ✓” jeśli Blobs włączone
    renderFiles();
  })();
})();
