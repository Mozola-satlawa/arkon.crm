// /netlify/functions/messages.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Obsługa GET (lista wiadomości w pokoju)
    if (event.httpMethod === 'GET') {
      const { room, before, limit } = event.queryStringParameters || {};
      const rows = await sql`
        SELECT * FROM messages
        WHERE room_id = ${room}
        ${before ? sql`AND created_at < ${before}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${limit || 50}
      `;
      return {
        statusCode: 200,
        body: JSON.stringify(rows),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Obsługa POST (dodanie wiadomości)
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const row = await sql`
        INSERT INTO messages (room_id, author, body, file_url, parent_id)
        VALUES (${data.room}, ${data.author}, ${data.text}, ${data.file_url}, ${data.parent_id || null})
        RETURNING *
      `;
      return {
        statusCode: 200,
        body: JSON.stringify(row[0]),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Jeśli metoda nieobsługiwana
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };

  } catch (err) {
    console.error('❌ Błąd w messages.js:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
