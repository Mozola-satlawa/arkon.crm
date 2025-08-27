
import { neon } from '@netlify/neon';

export default async (req, context) => {
  const sql = neon(); // używa NETLIFY_DATABASE_URL z env

  const { postId } = req.query || {};

  if (!postId) {
    return new Response(JSON.stringify({ error: 'Brak parametru postId' }), { status: 400 });
  }

  try {
    const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
    return new Response(JSON.stringify(post), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
