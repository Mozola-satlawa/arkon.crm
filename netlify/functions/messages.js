
// netlify/functions/messages.js
import { neon } from '@netlify/neon';

const sql = neon(); // użyje NETLIFY_DATABASE_URL

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...CORS },
    ...init
  });

export default async function handler(request) {
  if (request.method === 'OPTIONS') return new Response('', { headers: CORS });

  // --- GET: lista wiadomości ---
  if (request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const room  = (url.searchParams.get('room') || 'global').slice(0, 80);
      const before = url.searchParams.get('before'); // ISO
      const limit  = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));

      const params = [room];
      let where = 'room_id = $1';
      if (before) {
        params.push(before);
        where += ` AND created_at < $${params.length}`;
      }

      const rows = await sql`
        SELECT id, room_id, author, body, file_url, parent_id,
               created_at, edited_at, deleted_at
        FROM messages
        WHERE ${sql.unsafe(where)}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      // front zwykle sortuje sam, ale jak chcesz rosnąco:
      rows.reverse();
      return json(rows);
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  }

  // --- POST: zapisz wiadomość ---
  if (request.method === 'POST') {
    try {
      const b = await request.json();
      const room      = (b.room || b.room_id || 'global').slice(0, 80);
      const author    = (b.author || 'Anon').slice(0, 80);
      const text      = (b.text || b.body || '').toString();
      const file_url  = (b.file_url || null);
      const parent_id = b.parent_id || null;

      if (!room)   return json({ error: 'room required' }, { status: 400 });
      if (!author) return json({ error: 'author required' }, { status: 400 });

      const [row] = await sql`
        INSERT INTO messages (room_id, author, body, file_url, parent_id)
        VALUES (${room}, ${author}, ${text}, ${file_url}, ${parent_id})
        RETURNING id, room_id, author, body, file_url, parent_id, created_at
      `;
      return json(row, { status: 201 });
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
}
