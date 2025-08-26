// netlify/functions/blobs-health.js
import { getStore } from '@netlify/blobs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { ok: false, error: 'Method Not Allowed' });

  try {
    // 1) bierzemy namespace (tworzy się automatycznie przy pierwszym zapisie)
    const ns = 'chat-health';
    const store = getStore(ns);

    // 2) zapis testowego klucza
    const key = ping/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt;
    const payload = hello from blobs @ ${new Date().toISOString()};
    await store.set(key, new TextEncoder().encode(payload), {
      metadata: { note: 'healthcheck' },
    });

    // 3) odczyt z powrotem
    const gotBuf = await store.get(key, { type: 'arrayBuffer' });
    const got = gotBuf ? new TextDecoder().decode(gotBuf) : null;

    // 4) listing (kilka ostatnich kluczy z prefiksem ping/)
    const { blobs } = await store.list({ prefix: 'ping/' });

    // 5) (opcjonalnie) publiczny URL pobrania przez wbudowany serwer Netlify
    //    UWAGA: to jest URL tylko-do-odczytu, działa, gdy znasz nazwę klucza.
    const publicUrl = /.netlify/blobs/${encodeURIComponent(ns)}/${encodeURIComponent(key)};

    return json(200, {
      ok: true,
      wrote: key,
      length: payload.length,
      readBack: got,
      countInPrefix: blobs?.length || 0,
      publicUrl,
      hint:
        'Jeśli widzisz ok:true i readBack == hello…, Netlify Blobs działa. URL publiczny otwórz w nowej karcie.',
    });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
};
