// netlify/functions/upload.js
import { getStore } from '@netlify/blobs';

const store = getStore('chat-uploads');
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers, status: 204 });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return new Response(JSON.stringify({ ok:false, error:'file required' }), { status:400, headers: { ...headers, 'Content-Type':'application/json' } });

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const key = uploads/${Date.now()}-${crypto.randomUUID()}.${ext};
    await store.set(key, await file.arrayBuffer(), { metadata: { name:file.name, type:file.type||'application/octet-stream' } });
    // publiczny URL do pobrania przez Blobs:
    const url = /.netlify/blobs/${encodeURIComponent('chat-uploads')}/${encodeURIComponent(key)};

    return new Response(JSON.stringify({ ok:true, url }), { status:201, headers: { ...headers, 'Content-Type':'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || String(e) }), { status:500, headers: { ...headers, 'Content-Type':'application/json' } });
  }
};
