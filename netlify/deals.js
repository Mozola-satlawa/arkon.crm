import { neon } from '@netlify/neon'
const sql = neon()

/**
 * GET    /.netlify/functions/deals?clientId=<uuid>  -> list deals for client
 * POST   JSON: { clientId, title, status, value_numeric }
 * PATCH  JSON: { id, title?, status?, value_numeric? }
 * DELETE JSON: { id }
 */
export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const clientId = event.queryStringParameters?.clientId
      if (!clientId) return { statusCode: 400, body: 'Missing clientId' }
      const rows = await sql`
        select d.*, c.name as client_name
        from deals d
        join clients c on c.id = d.client_id
        where d.client_id = ${clientId}
        order by d.created_at desc
      `
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const { clientId, title, status, value_numeric } = JSON.parse(event.body || '{}')
      if (!clientId || !title) return { statusCode: 400, body: 'Missing clientId/title' }
      const [row] = await sql`
        insert into deals (client_id, title, status, value_numeric)
        values (${clientId}, ${title}, ${status || 'new'}, ${value_numeric || null})
        returning *
      `
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) }
    }

    if (event.httpMethod === 'PATCH') {
      const { id, title, status, value_numeric } = JSON.parse(event.body || '{}')
      if (!id) return { statusCode: 400, body: 'Missing id' }
      const [row] = await sql`
        update deals
        set title = coalesce(${title}, title),
            status = coalesce(${status}, status),
            value_numeric = coalesce(${value_numeric}, value_numeric)
        where id = ${id}
        returning *
      `
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) }
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}')
      if (!id) return { statusCode: 400, body: 'Missing id' }
      await sql`delete from deals where id = ${id}`
      return { statusCode: 200, body: 'OK' }
    }

    return { statusCode: 405, body: 'Method not allowed' }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}