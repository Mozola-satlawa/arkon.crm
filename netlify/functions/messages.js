// netlify/functions/messages.js
import { neon } from '@netlify/neon';

export const config = { path: '/api/messages' };

export default async (req) => {
  try {
    const sql = neon(); // użyje NETLIFY_DATABASE_URL z env
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const room = url.searchParams.get('room') || 'global';
      const before = url.searchParams.get('before'); // ISO
      const limit  = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

      const rows = before
        ? await sql`
            SELECT id, room_id, author, body, file_url, parent_id,
                   to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') as created_at
            FROM messages
            WHERE room_id = ${room} AND created_at < ${before}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT id, room_id, author, body, file_url, parent_id,
                   to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') as created_at
            FROM messages
            WHERE room_id = ${room}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;

      // front oczekuje rosnąco
      rows.reverse();
      return json(rows, 200);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const room_id   = (body.room || body.room_id || 'global').toString();
      const author    = (body.author || 'Anon').toString();
      const text      = (body.text || body.body || '').toString();
      const parent_id = body.parent_id || null;
      const file_url  = body.file_url || null;

      const [row] = await sql`
        INSERT INTO messages (room_id, author, body, file_url, parent_id)
        VALUES (${room_id}, ${author}, ${text}, ${file_url}, ${parent_id})
        RETURNING id, room_id, author, body, file_url, parent_id,
                  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') as created_at
      `;

      return json(row, 201);
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
