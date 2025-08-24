import { blobs } from '@netlify/blobs'

/**
 * Initializes Netlify Blobs by creating (if needed) a store named "files"
 * and writing a tiny readme.txt. Call this once by opening:
 *   /.netlify/functions/init-blobs
 */
export async function handler() {
  try {
    const store = blobs({ name: 'files' }) // Store name
    const { key } = await store.set('readme.txt', 'Hello from Netlify Blobs!', {
      contentType: 'text/plain'
    })

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, key })
    }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}