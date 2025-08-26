// netlify/functions/store.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const ok = (body) => ({
  statusCode: 200,
  headers: CORS,
  body: JSON.stringify(body)
});
const bad = (msg) => ({
  statusCode: 400,
  headers: CORS,
  body: JSON.stringify({ error: msg })
});
const err = (e) => ({
  statusCode: 500,
  headers: CORS,
  body: JSON.stringify({ error: e.message || String(e) })
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const store = getStore("chat-storage");

  try {
    // GET → pobierz wszystko
    if (event.httpMethod === "GET") {
      const { blobs } = await store.list();
      const items = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: "json" });
        if (data) items.push(data);
      }
      return ok({ items });
    }

    // POST → dodaj nową wiadomość
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      const payload = JSON.parse(event.body);
      const id = "m_" + Date.now().toString(36);
      const rec = {
        id,
        room: payload.room || "default",
        author: payload.author || "anon",
        text: payload.text || "",
        created_at: Date.now()
      };
      await store.setJSON(id, rec);
      return ok({ id, saved: true });
    }

    // DELETE → usuń wszystkie (np. do testów)
    if (event.httpMethod === "DELETE") {
      const { blobs } = await store.list();
      for (const b of blobs) {
        await store.delete(b.key);
      }
      return ok({ cleared: blobs.length });
    }

    return bad("Unsupported method");
  } catch (e) {
    return err(e);
  }
}
