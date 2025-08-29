// netlify/functions/messages.js  (ESM – zgodny z "type":"module")
import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const sql = (() => {
  const url = process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  if (!url) console.warn('⚠ Brak NETLIFY_DATABASE_URL w env.');
  return url ? neon(url) : null;
})();

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS };
  }

  try {
    if (!sql) throw new Error('Database connection not configured.');

    // GET: lista wiadomości w pokoju
    if (event.httpMethod === 'GET') {
      const { room, before, limit } = event.queryStringParameters || {};
      if (!room) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing ?room' }) };
      }
      const lim = Math.max(1, Math.min(parseInt(limit || '50', 10) || 50, 200));
      const rows = await sql`
        SELECT id, room_id, author, body, file_url, parent_id, created_at
        FROM messages
        WHERE room_id = ${room}
        ${before ? sql`AND created_at < ${before}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${lim}
      `;
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(rows) };
    }

    // POST: dodanie wiadomości
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No body' }) };
      }
      const data = JSON.parse(event.body || '{}');
      if (!data.room || !data.text) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing room or text' }) };
      }
      const [row] = await sql`
        INSERT INTO messages (room_id, author, body, file_url, parent_id)
        VALUES (${data.room}, ${data.author || 'Anon'}, ${data.text}, ${data.file_url || null}, ${data.parent_id || null})
        RETURNING id, room_id, author, body, file_url, parent_id, created_at
      `;
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(row) };
    }

    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('❌ messages.js error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
}
