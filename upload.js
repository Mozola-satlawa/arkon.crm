import { blobs } from '@netlify/blobs'
import { neon } from '@netlify/neon'

const sql = neon()

/**
 * Upload a file to Netlify Blobs and save metadata in Postgres.
 * Expects JSON body:
 * { clientId, dealId, fileName, mimeType, base64 }
 */
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Use POST' }
  }

  try {
    const payload = JSON.parse(event.body || '{}')
    const { clientId, dealId, fileName, mimeType, base64 } = payload

    if (!clientId) return { statusCode: 400, body: 'Missing clientId' }
    if (!fileName || !base64) return { statusCode: 400, body: 'Missing fileName/base64' }

    const store = blobs({ name: 'files' })
    const buffer = Buffer.from(base64, 'base64')

    // 1) Zapis do Blobs
    const { key } = await store.set(fileName, buffer, { contentType: mimeType || 'application/octet-stream' })

    // 2) Metadane w Postgres
    const [doc] = await sql`
      insert into documents (client_id, deal_id, filename, storage_key, size_bytes, mime_type)
      values (${clientId}, ${dealId || null}, ${fileName}, ${key}, ${buffer.length}, ${mimeType || 'application/octet-stream'})
      returning *
    `

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(doc)
    }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
