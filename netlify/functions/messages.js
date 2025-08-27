import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
  try {
    if (req.method === 'GET') {
      const { room, before, limit } = req.query;

      if (!room) {
        return new Response(JSON.stringify({ error: 'Missing room' }), { status: 400 });
      }

      let q = `
        SELECT * FROM messages
        WHERE room_id = ${room}
      `;
      if (before) q += ` AND created_at < ${before}`;
      q += ` ORDER BY created_at DESC LIMIT ${limit || 50}`;

      const rows = await sql.unsafe(q);
      return new Response(JSON.stringify(rows), { status: 200 });
    }

    if (req.method === 'POST') {
      const body = await req.json();

      const rows = await sql`
        INSERT INTO messages (room_id, author, body, file_url, parent_id)
        VALUES (${body.room}, ${body.author}, ${body.text || ''}, ${body.file_url || null}, ${body.parent_id || null})
        RETURNING *
      `;

      return new Response(JSON.stringify(rows[0]), { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    console.error('DB error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
