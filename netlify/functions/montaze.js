// ESM (package.json ma "type": "module")
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

// wspólne nagłówki (CORS + JSON)
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function handler(event) {
  try {
    // Preflight CORS
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers };
    }

    const method = event.httpMethod;

    if (method === 'GET') {
      const { from, to } = event.queryStringParameters || {};
      const rows = await sql`
        SELECT *
        FROM montaze
        WHERE (${from}::date IS NULL OR date >= ${from})
          AND (${to}::date   IS NULL OR date <= ${to})
        ORDER BY date, time NULLS FIRST;
      `;
      return ok(rows);
    }

    if (method === 'POST') {
      // oczekujemy JSON z polami jak w front-endzie (kalendarz)
      const d = JSON.parse(event.body || '{}');

      // Bezpieczeństwo: normalizacja typów
      const installers = Array.isArray(d.installers) ? d.installers : (d.installers ? [d.installers] : []);
      const dur = d.dur != null ? Number(d.dur) : null;

      const row = await sql`
        INSERT INTO montaze
          (id,     date,     time,     dur,  client,   addr,    scope,    installers,  status,   notes,   phone)
        VALUES
          (${d.id}, ${d.date}, ${d.time}, ${dur}, ${d.client}, ${d.addr}, ${d.scope}, ${installers}, ${d.status}, ${d.notes}, ${d.phone})
        ON CONFLICT (id) DO UPDATE SET
          date=${d.date},
          time=${d.time},
          dur=${dur},
          client=${d.client},
          addr=${d.addr},
          scope=${d.scope},
          installers=${installers},
          status=${d.status},
          notes=${d.notes},
          phone=${d.phone}
        RETURNING *;
      `;
      return ok(row[0]);
    }

    if (method === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return err(400, 'Brak id');
      await sql`DELETE FROM montaze WHERE id = ${id};`;
      return ok({ deleted: id });
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('❌ montaze.js error', e);
    return err(500, e.message || String(e));
  }
}

function ok(data) {
  return { statusCode: 200, headers, body: JSON.stringify(data) };
}
function err(code, message) {
  return { statusCode: code, headers, body: JSON.stringify({ error: message }) };
}
