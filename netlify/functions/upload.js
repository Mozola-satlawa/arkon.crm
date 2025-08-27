
// netlify/functions/upload.js
export const config = { path: '/api/upload' };

export default async (req, ctx) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Wymagane: Netlify Blobs (DANE PERSISTENTNE)
    // W Netlify włącz Blobs, a w funkcji ctx.blobs będzie dostępny store.
    const store = ctx?.blobs?.site;
    if (!store) {
      return json({
        error: 'Netlify Blobs nieaktywne. Włącz Blobs w projekcie i daj funkcji dostęp (ctx.blobs.site).'
      }, 501);
    }

    const form = await req.formData();
    const file = form.get('file');
    const room = (form.get('room') || 'global').toString();

    if (!file || typeof file === 'string') {
      return json({ error: 'Brak pliku w form-data pod kluczem "file".' }, 400);
    }

    const arrayBuf = await file.arrayBuffer();
    const ext = (file.name || 'file').split('.').pop();
    const key = uploads/${room}/${Date.now()}_${sanitize(file.name || 'plik')};

    // Zapis do Blobs
    await store.set(key, new Uint8Array(arrayBuf), {
      contentType: file.type || 'application/octet-stream'
    });

    // Publiczny URL (Netlify Blobs hostuje pod ich subdomeną)
    const url = await store.getPublicUrl(key);

    return json({ url, key, size: file.size, type: file.type || null }, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};

function sanitize(s='') {
  return s.normalize('NFKD').replace(/[^\w.\-]+/g, '_').slice(0, 140);
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
