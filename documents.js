import { neon } from '@netlify/neon'
const sql = neon()

/**
 * List documents for a given client.
 * GET /.netlify/functions/documents?clientId=<uuid>
 */
export async function handler(event) {
  const clientId = event.queryStringParameters?.clientId
  if (!clientId) return { statusCode: 400, body: 'Missing clientId' }

  const rows = await sql`
    select id, created_at, filename, storage_key, size_bytes, mime_type, deal_id
    from documents
    where client_id = ${clientId}
    order by created_at desc
  `

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(rows)
  }
}