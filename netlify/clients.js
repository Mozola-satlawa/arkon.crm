import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.NETLIFY_DATABASE_URL)

export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const rows = await sql`select * from clients order by created_at desc`
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) }
    }

    if (event.httpMethod === 'POST') {
      const { name, email, phone, notes } = JSON.parse(event.body || '{}')
      if (!name) return { statusCode: 400, body: 'Missing name' }
      const [row] = await sql`
        insert into clients (name, email, phone, notes)
        values (${name}, ${email || null}, ${phone || null}, ${notes || null})
        returning *
      `
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) }
    }

    if (event.httpMethod === 'PATCH') {
      const { id, name, email, phone, notes } = JSON.parse(event.body || '{}')
      if (!id) return { statusCode: 400, body: 'Missing id' }
      const [row] = await sql`
        update clients
        set name = coalesce(${name}, name),
            email = coalesce(${email}, email),
            phone = coalesce(${phone}, phone),
            notes = coalesce(${notes}, notes)
        where id = ${id}
        returning *
      `
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) }
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}')
      if (!id) return { statusCode: 400, body: 'Missing id' }
      await sql`delete from clients where id = ${id}`
      return { statusCode: 200, body: 'OK' }
    }

    return { statusCode: 405, body: 'Method not allowed' }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
