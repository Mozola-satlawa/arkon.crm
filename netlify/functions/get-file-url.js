import { blobs } from '@netlify/blobs'

/**
 * Returns a temporary signed URL for a file in Netlify Blobs.
 * Expects JSON body: { key }
 */
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Use POST' }
  }

  try {
    const { key } = JSON.parse(event.body || '{}')
    if (!key) return { statusCode: 400, body: 'Missing key' }

    const store = blobs({ name: 'files' })
    const url = await store.getSignedUrl(key, { expiresIn: 60 * 60 }) // 1 hour

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url })
    }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
