// netlify/functions/messages.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});

const ok  = (body = {}) => json(200, body);
const bad = (msg = "Bad Request") => json(400, { ok: false, error: msg });

const rid = (p = "") =>
  ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  const store = getStore("chat-messages");

  try {
    // GET /api/messages?room=<id>&before=<iso opcjonalnie>
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl || http://x${event.path}${event.rawQuery ? "?" + event.rawQuery : ""});
      const room   = url.searchParams.get("room")   || "global";
      const before = url.searchParams.get("before") || null;

      const prefix = room/${room}/;
      const { blobs } = await store.list({ prefix });

      const items = [];
      for (const b of blobs || []) {
        const data = await store.get(b.key, { type: "json" });
        if (!data) continue;
        if (before && (data.created_at || "") >= before) continue;
        items.push(data);
      }
      items.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

      const oldest = items[0]?.created_at || null;
      return ok({ items, oldest });
    }

    // POST /api/messages   body: { room, author, body, fileUrl, parentId }
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak JSON body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Zły JSON"); }

      const room     = payload.room || "global";
      const author   = payload.author || "Anon";
      const body     = payload.body || "";
      const fileUrl  = payload.fileUrl || null;   // <-- ważne
      const parentId = payload.parentId || null;

      const now = new Date().toISOString();
      const id  = rid("m_");
      const item = {
        id,
        room_id: room,
        author,
        body,
        file_url: fileUrl,
        parent_id: parentId,
        created_at: now,
        reactions: {}
      };

      const key = room/${room}/${now}-${id}.json;
      await store.setJSON(key, item);

      return json(201, { ok: true, item });
    }

    // PATCH /api/messages   body: { id, body?, reaction? }
    if (event.httpMethod === "PATCH") {
      if (!event.body) return bad("Brak JSON body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Zły JSON"); }
      const { id, body, reaction } = payload;
      if (!id) return bad("id required");

      // znajdź rekord po id (prosta pętla po kluczach)
      const { blobs, directories } = await store.list({ directories: true });
      const rooms = (directories || []).map(d => d.name).filter(Boolean);
      let foundKey = null, data = null;

      // przeszukujemy wszystkie pokoje room/<room>/
      for (const room of rooms) {
        const { blobs: roomBlobs } = await store.list({ prefix: room/${room}/ });
        for (const b of roomBlobs || []) {
          const item = await store.get(b.key, { type: "json" });
          if (item?.id === id) { foundKey = b.key; data = item; break; }
        }
        if (foundKey) break;
      }

      if (!foundKey || !data) return json(404, { ok: false, error: "not found" });

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

    // DELETE /api/messages?id=<id>
    if (event.httpMethod === "DELETE") {
      const url = new URL(event.rawUrl || http://x${event.path}${event.rawQuery ? "?" + event.rawQuery : ""});
      const id = url.searchParams.get("id");
      if (!id) return bad("id required");

      const { blobs, directories } = await store.list({ directories: true });
      const rooms = (directories || []).map(d => d.name).filter(Boolean);
      let foundKey = null, data = null;

      for (const room of rooms) {
        const { blobs: roomBlobs } = await store.list({ prefix: room/${room}/ });
        for (const b of roomBlobs || []) {
          const item = await store.get(b.key, { type: "json" });
          if (item?.id === id) { foundKey = b.key; data = item; break; }
        }
        if (foundKey) break;
      }

      if (!foundKey || !data) return json(404, { ok: false, error: "not found" });

      data.deleted_at = new Date().toISOString();
      data.body = "[usunięto]";
      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
