/* ARKON • minimalny czat + upload (Supabase) */
(() => {
  'use strict';

  // --- KONFIG -------------------------------------------------
  const SB_URL = 'https://phxxjirqlktzcwnygaha.supabase.co';  // <-- Twoje
  const SB_KEY = 'sb_publishable_iOXdu9fUGGko3MqPmltAag_ZbPUxp4r'; // <-- Twoje
  const supa = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession:false } });

  // --- MINI-HELPERY -------------------------------------------
  const $ = s => document.querySelector(s);
  const el = (t,a={}) => Object.assign(document.createElement(t),a);
  const fmt = ts => new Intl.DateTimeFormat('pl-PL',{dateStyle:'short',timeStyle:'short'}).format(new Date(ts));

  // Bazowe elementy (tworzymy jeśli ich nie ma, żeby nigdy nie było „pustej strony”)
  function ensureDom() {
    if (!$('#msgs')) {
      const wrap = el('div', { id:'msgs', style:'height:60vh;overflow:auto;padding:12px;border:1px solid #334;border-radius:10px' });
      document.body.appendChild(wrap);
    }
    if (!$('#txt')) {
      const ta = el('textarea',{ id:'txt', rows:2, style:'width:100%;margin-top:8px' });
      document.body.appendChild(ta);
    }
    if (!$('#btnSend')) {
      const b = el('button',{ id:'btnSend', textContent:'Wyślij', style:'margin:8px 0' });
      document.body.appendChild(b);
    }
    if (!$('#file')) {
      const f = el('input',{ id:'file', type:'file' });
      document.body.appendChild(f);
    }
    if (!$('#meName')) {
      const s = el('span',{ id:'meName' });
      document.body.insertBefore(el('div',{textContent:'Użytkownik: '}), document.body.firstChild);
      document.body.insertBefore(s, document.body.children[1]);
    }
    if (!$('#roomTitle')) {
      const r = el('div',{ id:'roomTitle', style:'margin:8px 0;font-weight:700' });
      r.textContent = 'GLOBAL';
      document.body.insertBefore(r, document.body.children[0]);
    }
  }
  ensureDom();

  // --- STAN ---------------------------------------------------
  const state = {
    room: localStorage.getItem('chat_room') || 'global',
    me:   localStorage.getItem('chat_me')   || 'Pracownik',
    sub:  null,
    oldest: null,
    list: []
  };

  $('#meName').textContent = state.me;
  $('#roomTitle').textContent = state.room.toUpperCase();

  // --- RENDER -------------------------------------------------
  function render() {
    const box = $('#msgs');
    if (!box) return;
    const out = state.list
      .filter(m => !m.parent_id)
      .map(m => {
        const when = fmt(m.created_at);
        const body = (m.deleted_at ? '<i>[usunięto]</i>' : (m.body||''))
                      .replace(/(https?:\/\/\S+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
        const file = m.file_url ? <div><a href="${m.file_url}" target="_blank">📎 ${m.file_url.split('/').pop()}</a></div> : '';
        return `<div style="margin:6px 0;padding:8px;border:1px solid #223;border-radius:8px">
          <div style="font-size:12px;opacity:.8">${m.author} • ${when}</div>
          <div>${body}${file}</div>
        </div>`;
      }).join('');
    box.innerHTML = out || '<div style="opacity:.7">Brak wiadomości.</div>';
    box.scrollTop = box.scrollHeight;
  }

  // --- ŁADOWANIE + PAGINACJA ---------------------------------
  async function loadInitial() {
    const { data, error } = await supa
      .from('messages')
      .select('*')
      .eq('room_id', state.room)
      .order('created_at',{ ascending:true })
      .limit(80);
    if (error) { console.error(error); return; }
    state.list = data || [];
    state.oldest = state.list.length ? state.list[0].created_at : null;
    render();
  }

  // --- SUBSKRYPCJA REALTIME ----------------------------------
  async function subscribe() {
    if (state.sub) { try { await supa.removeChannel(state.sub); } catch {} }
    state.sub = supa
      .channel('room:'+state.room)
      .on('postgres_changes',
          { event:'INSERT', schema:'public', table:'messages', filter: 'room_id=eq.' + state.room },
          (p) => { state.list.push(p.new); render(); })
      .on('postgres_changes',
          { event:'UPDATE', schema:'public', table:'messages', filter: 'room_id=eq.' + state.room },
          (p) => {
            const i = state.list.findIndex(x => x.id === p.new.id);
            if (i > -1) { state.list[i] = p.new; render(); }
          })
      .subscribe();
  }

  // --- WYSYŁANIE ---------------------------------------------
  async function send(body, fileUrl=null) {
    body = (body||'').trim();
    if (!body && !fileUrl) return;
    const { error } = await supa.from('messages').insert([{
      room_id: state.room,
      author:  state.me,
      body,
      file_url: fileUrl
    }]);
    if (error) alert('Błąd wysyłania: ' + error.message);
    $('#txt').value = '';
  }

  $('#btnSend').addEventListener('click', ()=> send($('#txt').value));
  $('#txt').addEventListener('keydown', e=>{
    if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); send($('#txt').value); }
  });

  // --- UPLOAD DO STORAGE -------------------------------------
  $('#file').addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if (!f) return;
    try {
      const safe = f.name.replace(/[^\w.\-]+/g,'_');
      const path = ${state.room}/${Date.now()}_${safe};
      const up = await supa.storage.from('chat').upload(path, f, {
        cacheControl: '3600',
        contentType: f.type || 'application/octet-stream',
        upsert: false
      });
      if (up.error) throw up.error;
      const pub = supa.storage.from('chat').getPublicUrl(path);
      await send('', pub.data.publicUrl);
    } catch (err) {
      console.error(err);
      alert('Nie udało się przesłać pliku: ' + (err.message||err));
    }
    e.target.value = '';
  });

  // --- START --------------------------------------------------
  (async function init(){
    try {
      await loadInitial();
      await subscribe();
      // nagłówki
      $('#meName').textContent = state.me;
      $('#roomTitle').textContent = state.room.toUpperCase();
    } catch (e) {
      console.error(e);
      // wyświetl błąd na stronie (żeby nie było „pustej strony”)
      const pre = el('pre',{textContent: (e && e.stack) ? e.stack : String(e)});
      pre.style.cssText='white-space:pre-wrap;color:#ffbcbc;background:#111;padding:12px;border:1px solid #b55';
      document.body.appendChild(pre);
    }
  })();

})();
