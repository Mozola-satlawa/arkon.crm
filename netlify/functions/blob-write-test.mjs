export async function handler() {
  try {
    const { blobs } = await import('@netlify/blobs'); // działa i w CJS i w ESM
    const store = blobs({ name: 'files' });
    const content = 'Hello from blob-write-test ' + new Date().toISOString();
    const { key } = await store.set('test.txt', content, { contentType: 'text/plain' });
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, key }) };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
