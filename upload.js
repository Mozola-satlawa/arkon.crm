// netlify/functions/upload.js
import { getStore } from '@netlify/blobs';

// Nazwa naszego „sklepu” z blobami (możesz zmienić)
const STORE_NAME = 'arkon-uploads';

// Pomocnicze: bezpieczna nazwa pliku
function safe(name = 'plik') {
  return String(name)
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/+/g, '')
    .toLowerCase();
}

// Ścieżka pod jaką zapiszemy plik
function makeKey({ clientId, fileName }) {
  const who = (clientId || 'bez-klienta').toLowerCase();
  const ts  = new Date().toISOString().replace(/[:.]/g, '-');
  return upload/${who}/${ts}_${safe(fileName)};
}

// Odczyt indexu (lista wszystkich wysyłek)
async function readIndex(store) {
  try {
    const res = await store.get('_index.json', { type: 'json' });
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

// Zapis indexu
async function writeIndex(store, list) {
  const body = JSON.stringify(list, null, 2);
  await store.set('_index.json', body, { contentType: 'application/json' });
}

// ----------------- ROUTER -----------------
export const handler = async (event) => {
  try {
    const store = getStore({ name: STORE_NAME });

    // Ping (szybki test)
    if (event.httpMethod === 'GET' && (event.queryStringParameters?.ping || '') === '1') {
      return json({ ok: true, store: STORE_NAME });
    }

    // Lista „magazynu” (ostatnie N)
    if (event.httpMethod === 'GET' && (event.queryStringParameters?.list || '') === '1') {
      const list = await readIndex(store);
      // Możesz filtrować po kliencie: ?list=1&client=ID
      const client = event.queryStringParameters?.client || '';
      const rows = client ? list.filter(r => (r.clientId || '') === client) : list;
      return json({ ok: true, rows });
    }

    // Pobranie pliku (proxy z funkcji) — np. /.netlify/functions/upload?get=1&key=...
    if (event.httpMethod === 'GET' && event.queryStringParameters?.get === '1') {
      const key = event.queryStringParameters?.key || '';
      if (!key) return bad('Missing key');
      const blob = await store.get(key, { type: 'arrayBuffer' });
      if (!blob?.blob) return notFound('File not found');
      const contentType = blob?.contentType || 'application/octet-stream';
      const b64 = Buffer.from(blob.blob).toString('base64');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          // „inline” – podgląd w przeglądarce; zmień na attachment jeśli chcesz wymuszać pobieranie
          'Content-Disposition': inline; filename="${key.split('/').slice(-1)[0]}"
        },
        body: b64,
        isBase64Encoded: true
      };
    }

    // Wysyłanie pliku: POST body=binary, nagłówki z metadanymi
    if (event.httpMethod === 'POST') {
      // UWAGA: Netlify przekaże body jako base64 dla nietekstowych typów.
      const buf = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');

      // Metadane z nagłówków
      const fileName   = decodeURIComponent(event.headers['x-file-name'] || 'plik.bin');
      const clientId   = decodeURIComponent(event.headers['x-client-id'] || '');
      const clientName = decodeURIComponent(event.headers['x-client-name'] || '');
      const category   = decodeURIComponent(event.headers['x-category'] || '');
      const tags       = decodeURIComponent(event.headers['x-tags'] || '');
      const contentType= event.headers['content-type'] || 'application/octet-stream';

      // Klucz (ścieżka)
      const key = makeKey({ clientId, fileName });

      // Zapis binary do Blobs
      await store.set(key, buf, { contentType });

      // Dopisz do indexu
      const row = {
        key,
        at: Date.now(),
        size: buf.length,
        contentType,
        clientId,
        clientName,
        category,
        tags
      };
      const index = await readIndex(store);
      index.unshift(row);
      // trzymajmy max 1000 wpisów (możesz zmienić)
      if (index.length > 1000) index.length = 1000;
      await writeIndex(store, index);

      // URL do pobrania przez funkcję (stabilny, publiczny)
      const viewUrl = /.netlify/functions/upload?get=1&key=${encodeURIComponent(key)};

      return json({ ok: true, key, viewUrl, ...row });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('UPLOAD ERROR:', e);
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
};

// ----------------- helpers -----------------
function json(obj, code = 200) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj)
  };
}
function bad(msg)     { return json({ ok: false, error: msg }, 400); }
function notFound(m)  { return json({ ok: false, error: m || 'Not found' }, 404); }
