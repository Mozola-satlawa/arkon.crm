import { blobs } from '@netlify/blobs'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.NETLIFY_DATABASE_URL)

/**
 * POST /.netlify/functions/upload
 * Body (JSON):
 * {
 *   "clientId": "UUID",
 *   "dealId": "UUID | null",
 *   "fileName": "nazwa.pdf",
 *   "mimeType": "application/pdf",
 *   "base64": "<dane pliku base64>"
 * }
 */
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Use POST' }
  }

  try {
    const { clientId, dealId, fileName, mimeType, base64 } = JSON.parse(event.body || '{}')

    if (!clientId) return { statusCode: 400, body: 'Missing clientId' }
    if (!fileName || !base64) return { statusCode: 400, body: 'Missing fileName/base64' }

    const store = blobs({ name: 'files' })
    const buffer = Buffer.from(base64, 'base64')

    const { key } = await store.set(fileName, buffer, {
      contentType: mimeType || 'application/octet-stream'
    })

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
