
// REST: GET /api/messages?room=global
//       POST /api/messages  {room, author, body, parentId?, fileUrl?}
//       PATCH /api/messages {id, body?, reaction?}
//       DELETE /api/messages?id=...
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const res = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b = {}) => res(200, b);
const bad = (m = "Bad Request") => res(400, { error: m });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  const store = getStore("chat-messages");

  try {
    if (event.httpMethod === "GET") {
      const u = new URL(event.rawUrl || `http://x${event.path}${event.queryString ? "?" + event.queryString : ""}`);
      const room = u.searchParams.get("room") || "global";
      const before = u.searchParams.get("before"); // ISO opcjonalnie

      const prefix = `room/${room}/`;
      const { blobs } = await store.list({ prefix });

      const items = [];
      for (const b of blobs) {
        const item = await store.get(b.key, { type: "json" });
        if (!item) continue;
        if (before && item.created_at >= before) continue;
        items.push(item);
      }
      items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
      const oldest = items[0]?.created_at || null;
      return ok({ items, oldest });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }

      const room = payload.room || "global";
      const now = new Date().toISOString();
      const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

      const item = {
        id,
        room_id: room,
        author: payload.author || "Anon",
        body: payload.body || "",
        parent_id: payload.parentId || null,
        file_url: payload.fileUrl || null,
        created_at: now,
        reactions: {}
      };

      const key = `room/${room}/${now}-${id}.json`;
      await store.setJSON(key, item);
      return res(201, { ok: true, item });
    }

    if (event.httpMethod === "PATCH") {
      if (!event.body) return bad("Brak body");
      let patch = {};
      try { patch = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      const { id, body, reaction } = patch;
      if (!id) return bad("id required");

      // przeszukanie po ID (prosto)
      const { blobs, directories } = await store.list({ directories: true, prefix: "room/" });
      let foundKey = null, data = null;

      for (const b of blobs) {
        const item = await store.get(b.key, { type: "json" });
        if (item?.id === id) { foundKey = b.key; data = item; break; }
      }
      if (!foundKey || !data) return res(404, { ok: false, error: "not found" });

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

    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) return bad("id required");

      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null, data = null;
      for (const b of blobs) {
        const item = await store.get(b.key, { type: "json" });
        if (item?.id === id) { foundKey = b.key; data = item; break; }
      }
      if (!foundKey || !data) return res(404, { ok: false, error: "not found" });

      data.deleted_at = new Date().toISOString();
      data.body = "[usunięto]";
      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    return res(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return res(500, { ok: false, error: e?.message || String(e) });
  }
}
