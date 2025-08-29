// ESM (package.json ma "type": "module")
import { sql } from '@netlify/neon';

/** CRUD dla montaży */
export async function handler(event) {
  try {
    const method = event.httpMethod;

    if (method === 'GET') {
      const { from, to } = event.queryStringParameters || {};
      const rows = await sql`
        SELECT * FROM montaze
        WHERE (${from}::date IS NULL OR date >= ${from})
          AND (${to}::date   IS NULL OR date <= ${to})
        ORDER BY date, time;
      `;
      return ok(rows);
    }

    if (method === 'POST') {
      const d = JSON.parse(event.body || '{}');
      const row = await sql`
        INSERT INTO montaze (id, date, time, client, installers, status, notes, address, phone)
        VALUES (${d.id}, ${d.date}, ${d.time}, ${d.client}, ${d.installers}, ${d.status},
                ${d.notes}, ${d.address}, ${d.phone})
        ON CONFLICT (id) DO UPDATE SET
          date=${d.date}, time=${d.time}, client=${d.client}, installers=${d.installers},
          status=${d.status}, notes=${d.notes}, address=${d.address}, phone=${d.phone}
        RETURNING *;
      `;
      return ok(row[0]);
    }

    if (method === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      await sql`DELETE FROM montaze WHERE id=${id};`;
      return ok({ deleted: id });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('montaze.js error', e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
}

function ok(data) {
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
