// netlify/functions/messages.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const send = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b = {}) => send(200, b);
const bad = (m = "Bad Request") => send(400, { error: m });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  const store = getStore("chat-messages");

  try {
    // GET /api/messages?room=global&before=ISO
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl || http://x${event.path});
      const room = url.searchParams.get("room") || "global";
      const before = url.searchParams.get("before"); // ISO opcjonalnie

      const prefix = room/${room}/;
      const { blobs } = await store.list({ prefix });

      const items = [];
      for (const b of blobs || []) {
        const obj = await store.get(b.key, { type: "json" });
        if (!obj) continue;
        if (before && String(obj.created_at || "") >= before) continue;
        items.push(obj);
      }
      items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
      const oldest = items[0]?.created_at ?? null;
      return ok({ items, oldest });
    }

    // POST /api/messages   {room, author, body, parentId?, fileUrl?}
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Zły JSON"); }

      const room = payload.room || "global";
      const nowISO = new Date().toISOString();
      const id = ${Date.now().toString(36)}_${crypto.randomUUID()};

      const item = {
        id,
        room_id: room,
        author: payload.author || "Anon",
        body: payload.body || "",
        parent_id: payload.parentId || null,
        file_url: payload.fileUrl || null,
        created_at: nowISO,
        reactions: {}
      };

      const key = room/${room}/${nowISO}-${id}.json;
      await store.setJSON(key, item);
      return send(201, { ok: true, item });
    }

    // PATCH /api/messages   {id, body?, reaction?}
    if (event.httpMethod === "PATCH") {
      if (!event.body) return bad("Brak body");
      let patch = {};
      try { patch = JSON.parse(event.body); } catch { return bad("Zły JSON"); }
      const { id, body, reaction } = patch;
      if (!id) return bad("id required");

      // znajdź po id
      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null;
      let data = null;

      for (const b of blobs || []) {
        const obj = await store.get(b.key, { type: "json" });
        if (obj?.id === id) { foundKey = b.key; data = obj; break; }
      }
      if (!foundKey || !data) return send(404, { error: "not found" });

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

    // DELETE /api/messages?id=...
    if (event.httpMethod === "DELETE") {
      const url = new URL(event.rawUrl || http://x${event.path});
      const id = url.searchParams.get("id");
      if (!id) return bad("id required");

      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null;
      let data = null;

      for (const b of blobs || []) {
        const obj = await store.get(b.key, { type: "json" });
        if (obj?.id === id) { foundKey = b.key; data = obj; break; }
      }
      if (!foundKey || !data) return send(404, { error: "not found" });

      data.deleted_at = new Date().toISOString();
      data.body = "[usunięto]";
      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    return send(405, { error: "Method not allowed" });
  } catch (e) {
    return send(500, { error: e?.message || String(e) });
  }
}
