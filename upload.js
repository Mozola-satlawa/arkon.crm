// netlify/functions/upload.js
// Node 18+, ESM
import { getStore } from '@netlify/blobs';
import Busboy from 'busboy';

export const config = { path: "/.netlify/functions/upload" };

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok:false, error:'Only POST' }), { status:405 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return new Response(JSON.stringify({ ok:false, error:'Expected multipart/form-data' }), { status:400 });
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });

    const files = [];
    let meta = { clientId:'bez-klienta', category:'Inne', tags:'' };

    const parsePromise = new Promise((resolve, reject) => {
      busboy.on('file', (name, file, info) => {
        const chunks = [];
        file.on('data', d => chunks.push(d));
        file.on('end', () => {
          const buf = Buffer.concat(chunks);
          files.push({
            fieldname: name,
            filename: info.filename,
            mime: info.mimeType,
            buffer: buf,
            bytes: buf.length
          });
        });
      });

      busboy.on('field', (name, val) => {
        if (name === 'clientId') meta.clientId = (val || 'bez-klienta').toLowerCase();
        if (name === 'category') meta.category = val || 'Inne';
        if (name === 'tags')     meta.tags = val || '';
      });

      busboy.on('error', reject);
      busboy.on('finish', resolve);
    });

    const body = req.body; // ReadableStream
    const reader = body.getReader();
    let done, value;
    while (({ done, value } = await reader.read()) && !done) {
      busboy.write(value);
    }
    busboy.end();

    await parsePromise;

    if (!files.length) {
      return new Response(JSON.stringify({ ok:false, error:'Brak plików' }), { status:400 });
    }

    // Netlify Blobs store
    const store = getStore('arkon-files'); // nazwa "sklepu" – możesz zmienić
    const nowIso = new Date().toISOString().replace(/[:.]/g,'-');
    const folder = upload/${meta.clientId};

    const results = [];
    for (const f of files) {
      const key = ${folder}/${nowIso}_${f.filename};
      // zapis do Blobs
      await store.set(key, f.buffer, {
        metadata: { category: meta.category, tags: meta.tags, mime: f.mime },
        contentType: f.mime
      });
      const url = store.getBlobUrl(key); // publiczny URL
      results.push({
        originalName: f.filename,
        bytes: f.bytes,
        mime: f.mime,
        url,
        key
      });
    }

    return new Response(JSON.stringify({ ok:true, count: results.length, files: results }), {
      status:200,
      headers: { 'content-type':'application/json' }
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok:false, error: String(e.message || e) }), { status:500 });
  }
};