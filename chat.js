(() => {
  "use strict";

  // === KONFIG ===
  const ROOM = localStorage.getItem('chat_room') || 'global';
  const ME   = localStorage.getItem('chat_me')   || 'Pracownik';

  // === DOM ===
  const $ = s => document.querySelector(s);
  const msgsBox = $('#msgs');
  const txt = $('#txt');
  const fileInput = $('#file');

  // Ustaw labelki (jeśli elementy istnieją)
  const roomLbl = $('#roomLbl'); if (roomLbl) roomLbl.textContent = ROOM;
  const meLbl   = $('#meLbl');   if (meLbl)   meLbl.textContent   = ME;

  // === HELPERS ===
  const INT = new Intl.DateTimeFormat('pl-PL', { dateStyle:'short', timeStyle:'short' });
  const esc = s => (s==null?'':String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const linkify = t => String(t||'').replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  function fileChip(url) {
    const name = (url||'').split('/').pop();
    const isImg = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
    return (
      '<a class="file" href="'+esc(url)+'" target="_blank" rel="noopener">📎 '+esc(name)+'</a>' +
      (isImg ? '<div style="margin-top:6px"><img src="'+esc(url)+'" alt="" style="max-width:300px;border:1px solid #2a3a75;border-radius:8px"></div>' : '')
    );
  }

  function render(messages) {
    const out = [];
    let lastDay = '';
    (messages || []).forEach(m => {
      const day = (m.created_at||'').slice(0,10);
      if (day && day !== lastDay) {
        out.push('<div class="meta" style="text-align:center;margin:6px 0">'+
          esc(INT.format(new Date(m.created_at)).split(',')[0])+'</div>');
        lastDay = day;
      }
      const me = m.author === ME;
      out.push(
        '<div class="msg '+(me ? 'me' : '')+'">'+
          '<div class="meta" style="min-width:90px">'+(me ? 'Ja' : esc(m.author||'—'))+'</div>'+
          '<div class="bub">'+
            (m.deleted_at ? '<i class="meta">[usunięto]</i>' : linkify(esc(m.body||'')))+
            (m.file_url ? fileChip(m.file_url) : '')+
            '<div class="meta" style="margin-top:4px">'+INT.format(new Date(m.created_at))+(m.edited_at ? ' • ed.' : '')+'</div>'+
          '</div>'+
        '</div>'
      );
    });
    msgsBox.innerHTML = out.join('');
    msgsBox.scrollTop = msgsBox.scrollHeight;
  }

  // === API ===
  async function apiGetMessages() {
    const url = '/api/messages?room=' + encodeURIComponent(ROOM);
    const res = await fetch(url);
    if (!res.ok) throw new Error('GET /api/messages HTTP '+res.status);
    return res.json(); // { items: [...] }
  }

  async function apiSend(body) {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ room: ROOM, author: ME, body })
    });
    if (!res.ok) throw new Error('POST /api/messages HTTP '+res.status);
    return res.json();
  }

  async function apiUpload(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('room', ROOM);
    const res = await fetch('/api/upload', { method:'POST', body: fd });
    if (!res.ok) throw new Error('POST /api/upload HTTP '+res.status);
    return res.json(); // { url: "https://..." }
  }

  // === AKCJE ===
  async function load() {
    try {
      const data = await apiGetMessages();
      render(data.items || data || []);
    } catch (e) {
      console.error(e);
      alert('Błąd pobierania wiadomości');
    }
  }

  async function sendMsg() {
    const text = (txt.value || '').trim();
    if (!text) return;
    try {
      await apiSend(text);
      txt.value = '';
      await load();
    } catch (e) {
      console.error(e);
      alert('Błąd wysyłania wiadomości');
    }
  }

  async function sendFile(file) {
    try {
      const up = await apiUpload(file);
      const url = up && up.url ? String(up.url) : '';
      await apiSend(url);
      await load();
    } catch (e) {
      console.error(e);
      alert('Błąd wysyłania pliku');
    }
  }

  // === ZDARZENIA ===
  const btnReload = $('#btnReload');
  if (btnReload) btnReload.addEventListener('click', load);

  const btnSend = $('#btnSend');
  if (btnSend) btnSend.addEventListener('click', sendMsg);

  const btnFile = $('#btnFile');
  if (btnFile) btnFile.addEventListener('click', () => fileInput && fileInput.click());

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) sendFile(f);
      e.target.value = '';
    });
  }

  if (txt) {
    txt.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendMsg();
      }
    });
  }

  // START
  load();
})();
