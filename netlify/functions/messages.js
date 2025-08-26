// netlify/functions/messages.js
import { getStore } from "@netlify/blobs";

/** CORS + util */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const res = (status, body, extra = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  body: JSON.stringify(body ?? {}),
});
const ok = (body) => res(200, body);
const bad = (msg) => res(400, { error: msg });
const notFound = () => res(404, { error: "Not found" });

const store = getStore("chat-messages"); // namespace Blobs

// pomocnicze
const rid = (p = "") => ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  try {
    // LISTA (GET /api/messages?room=...)
    if (event.httpMethod === "GET") {
      const room = (event.queryStringParameters?.room || "global").toLowerCase();
      const before = event.queryStringParameters?.before || null; // ISO opcjonalnie

      const prefix = room/${room}/;
      const { blobs = [] } = await store.list({ prefix });

      const items = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: "json" });
        if (!data) continue;
        if (before && (data.created_at || "") >= before) continue;
        items.push(data);
      }
      items.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      const oldest = items[0]?.created_at || null;

      return ok({ items, oldest });
    }

    // DODAJ WIADOMOŚĆ (POST /api/messages)
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try {
        payload = JSON.parse(event.body);
      } catch {
        return bad("Niepoprawny JSON");
      }

      const room = (payload.room || "global").toLowerCase();
      const nowIso = new Date().toISOString();
      const id = ${Date.now().toString(36)}_${rid()};

      const item = {
        id,
        room_id: room,
        author: payload.author || "Anon",
        body: payload.body || "",
        parent_id: payload.parentId || null,
        file_url: payload.fileUrl || null,
        created_at: nowIso,
        reactions: {},
      };

      const key = room/${room}/${nowIso}-${id}.json;
      await store.setJSON(key, item);
      return res(201, { ok: true, item });
    }

    // EDYCJA / REAKCJA (PATCH /api/messages)
    if (event.httpMethod === "PATCH") {
      if (!event.body) return bad("Brak body");
      let patch = {};
      try {
        patch = JSON.parse(event.body);
      } catch {
        return bad("Niepoprawny JSON");
      }
      const { id, body, reaction } = patch;
      if (!id) return bad("id required");

      // znajdź rekord po id
      const { blobs = [] } = await store.list({ prefix: "room/" });
      let foundKey = null;
      let data = null;

      for (const b of blobs) {
        const item = await store.get(b.key, { type: "json" });
        if (item?.id === id) {
          foundKey = b.key;
          data = item;
          break;
        }
      }
      if (!foundKey || !data) return notFound();

      if (typeof body === "string") {
        data.body = body;
        data.edited_at = new Date().toISOString();
      }
      if (reaction) {
        data.reactions = data.reactions || {};
        data.reactions[reaction] = (data.reactions[reaction] || 0) + 1;
      }

      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    // USUŃ (DELETE /api/messages?id=...)
    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id || "";
      if (!id) return bad("id required");

      const { blobs = [] } = await store.list({ prefix: "room/" });
      let foundKey = null;
      let data = null;

      for (const b of blobs) {
        const item = await store.get(b.key, { type: "json" });
        if (item?.id === id) {
          foundKey = b.key;
          data = item;
          break;
        }
      }
      if (!foundKey || !data) return notFound();

      data.deleted_at = new Date().toISOString();
      data.body = "[usunięto]";
      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    return res(405, { error: "Method not allowed" });
  } catch (e) {
    return res(500, { error: e?.message || String(e) });
  }
}
