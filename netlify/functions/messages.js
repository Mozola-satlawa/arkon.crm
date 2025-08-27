import { neon } from '@netlify/neon';

const sql = neon();

export default async function handler(req) {
  if (req.method === 'GET') {
    const { room, before, limit } = req.query;
    let q = SELECT * FROM messages WHERE room_id = $1;
    let params = [room];
    if (before) {
      q += ` AND created_at < $2`;
      params.push(before);
    }
    q += ` ORDER BY created_at DESC LIMIT ${limit || 50}`;
    const rows = await sql.unsafe(q, params);
    return new Response(JSON.stringify(rows), { status: 200 });
  }

  if (req.method === 'POST') {
    const { room, author, text, file_url, parent_id } = await req.json();
    const row = await sql`
      INSERT INTO messages (room_id, author, body, file_url, parent_id)
      VALUES (${room}, ${author}, ${text}, ${file_url}, ${parent_id})
      RETURNING *;
    `;
    return new Response(JSON.stringify(row), { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
}
