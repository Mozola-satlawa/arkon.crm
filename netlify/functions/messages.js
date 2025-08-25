import { getStore } from '@netlify/blobs';

export async function handler(event) {
  try {
    const method = event.httpMethod;
    const store = getStore('chat'); // nazwa store w Netlify Blobs

    if (method === 'GET') {
      const room = (event.queryStringParameters?.room || 'global').trim();
      const key = rooms/${room}.json;
      const data = (await store.getJSON(key)) || { head: 0, items: [] };
      return json(200, data);
    }

    if (method === 'POST') {
      if (!event.body) return json(400, { error: 'Missing body' });

      let payload;
      try {
        payload = JSON.parse(event.body);
      } catch {
        return json(400, { error: 'Invalid JSON' });
      }

      const room = (payload.room || 'global').trim();
      const author = String(payload.author || 'Anon').slice(0, 80);
      const body = String(payload.body || '').trim();
      if (!body) return json(400, { error: 'Message body is empty' });

      const key = rooms/${room}.json;
      const data = (await store.getJSON(key)) || { head: 0, items: [] };

      const id = Date.now();
      const msg = {
        id,
        room,
        author,
        body,
        created_at: new Date().toISOString(),
      };

      data.items.push(msg);
      data.head = id;

      await store.setJSON(key, data, { addRandomSuffix: false });

      return json(200, { ok: true, msg });
    }

    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: cors(),
      };
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: 'Server error', detail: String(err?.message || err) });
  }
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...cors() },
    body: JSON.stringify(obj),
  };
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
