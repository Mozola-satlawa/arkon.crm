// netlify/functions/messages.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});
const ok = (body = {}) => json(200, body);
const bad = (msg = "Bad Request") => json(400, { error: msg });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const store = getStore("messages");

  try {
    // LISTA wiadomości (GET)
    if (event.httpMethod === "GET") {
      const { blobs } = await store.list();
      const items = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: "json" });
        if (data) items.push(data);
      }
      // sortowanie po czasie
      items.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      return ok({ items });
    }

    // NOWA wiadomość (POST)
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak treści");
      const payload = JSON.parse(event.body); // {author, text, room}
      const id = m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)};
      const msg = {
        id,
        author: payload.author || "Anonim",
        text: payload.text || "",
        room: payload.room || "global",
        created_at: Date.now()
      };
      await store.setJSON(id, msg);
      return ok(msg);
    }

    return bad("Nieobsługiwane żądanie");
  } catch (e) {
    return json(500, { error: e.message || String(e) });
  }
}
