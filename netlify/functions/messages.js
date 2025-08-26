// netlify/functions/messages.js
import { getStore } from '@netlify/blobs';

const store = getStore('chat-messages'); // 1 "tabela" w Blobs
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers, status: 204 });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const room = url.searchParams.get('room') || 'global';
      const before = url.searchParams.get('before'); // ISO (opcjonalnie)

      // klucze w formacie: room/<room>/<timestamp>-<id>.json
      const prefix = room/${room}/;
      // pobierz wszystkie (prosto, do 1000); można potem paginować ręcznie
      const { blobs } = await store.list({ prefix });
      // posortuj rosnąco po ts
      const items = [];
      for (const b of blobs) {
        const key = b.key; // room/room/ts-id.json
        const body = await store.get(key, { type: 'json' });
        if (!body) continue;
        if (before && body.created_at >= before) continue; // chcemy starsze
        items.push(body);
      }
      items.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      const oldest = items[0]?.created_at || null;
      return json({ items, oldest });
    }

    if (req.method === 'POST') {
      const { room='global', author='Anon', body='', parentId=null, fileUrl=null } = await req.json();
      const now = new Date().toISOString();
      const id = ${Date.now().toString(36)}_${crypto.randomUUID()};
      const item = { id, room_id: room, author, body, parent_id: parentId, file_url: fileUrl, created_at: now, reactions:{} };
      const key = room/${room}/${now}-${id}.json;
      await store.setJSON(key, item);
      return json({ ok:true, item }, 201);
    }

    if (req.method === 'PATCH') {
      const { id, body, reaction } = await req.json();
      if (!id) return json({ ok:false, error:'id required' }, 400);
      // znajdź klucz po id (przelatujemy listę; dla prostoty)
      const { blobs } = await store.list({ prefix: 'room/' , paginate: true });
      let foundKey = null, data = null;
      for await (const page of blobs) {
        for (const b of page.blobs || []) {
          const item = await store.get(b.key, { type: 'json' });
          if (item?.id === id) { foundKey = b.key; data = item; break; }
        }
        if (foundKey) break;
      }
      if (!foundKey || !data) return json({ ok:false, error:'not found' }, 404);

      if (typeof body === 'string') {
        data.body = body;
        data.edited_at = new Date().toISOString();
      }
      if (reaction) {
        data.reactions = data.reactions || {};
        data.reactions[reaction] = (data.reactions[reaction] || 0) + 1;
      }
      await store.setJSON(foundKey, data);
      return json({ ok:true });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) return json({ ok:false, error:'id required' }, 400);

      // jak wyżej: odszukaj klucz po id i oznacz jako usunięte
      const { blobs } = await store.list({ prefix: 'room/', paginate: true });
      let foundKey = null, data = null;
      for await (const page of blobs) {
        for (const b of page.blobs || []) {
          const item = await store.get(b.key, { type: 'json' });
          if (item?.id === id) { foundKey = b.key; data = item; break; }
        }
        if (foundKey) break;
      }
      if (!foundKey || !data) return json({ ok:false, error:'not found' }, 404);

      data.deleted_at = new Date().toISOString();
      data.body = '[usunięto]';
      await store.setJSON(foundKey, data);
      return json({ ok:true });
    }

    return json({ ok:false, error:'Method not allowed' }, 405);
  } catch (e) {
    return json({ ok:false, error: e?.message || String(e) }, 500);
  }
};

function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers }); }
