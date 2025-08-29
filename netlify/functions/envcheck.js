// netlify/functions/envcheck.js  (ESM)
export async function handler() {
  const has = Boolean(process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ NETLIFY_DATABASE_URL: has ? 'present' : 'missing' }),
  };
}
