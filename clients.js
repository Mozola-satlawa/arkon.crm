import { neon } from '@netlify/neon';
const sql = neon();

export async function handler(event) {
  if (event.httpMethod === 'GET') {
    const rows = await sql`select * from clients order by created_at desc`;
    return { statusCode: 200, body: JSON.stringify(rows) };
  }

  if (event.httpMethod === 'POST') {
    const { name, email, phone, notes } = JSON.parse(event.body || '{}');
    const [row] = await sql`
      insert into clients (name, email, phone, notes)
      values (${name}, ${email}, ${phone}, ${notes})
      returning *
    `;
    return { statusCode: 200, body: JSON.stringify(row) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
}