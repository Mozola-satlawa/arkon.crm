
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

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  const store = getStore("chat-messages");

  try {
    // LIST
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl || http://x${event.path}${event.queryString ? "?" + event.queryString : ""});
      const room = url.searchParams.get("room") || "global";
      const before = url.searchParams.get("before"); // ISO

      const prefix = room/${room}/;
      const { blobs } = await store.list({ prefix });
      const items = [];

      for (const b of blobs || []) {
        const data = await store.get(b.key, { type: "json" });
        if (!data) continue;
        if (before && (data.created_at || "") >= before) continue; // jeśli chcemy tylko starsze
        items.push(data);
      }

      items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
      const oldest = items[0]?.created_at || null;
      return json(200, { items, oldest });
    }

    // CREATE
    if (event.httpMethod === "POST") {
      if (!event.body) return json(400, { ok: false, error: "Brak body" });
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return json(400, { ok: false, error: "Zły JSON" }); }

      const room = payload.room || "global";
      const now = new Date().toISOString();
      const id = ${Date.now().toString(36)}_${crypto.randomUUID()};
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
      const key = room/${room}/${now}-${id}.json;
      await store.setJSON(key, item);
      return json(201, { ok: true, item });
    }

    // PATCH (edit / reaction)
    if (event.httpMethod === "PATCH") {
      if (!event.body) return json(400, { ok: false, error: "Brak body" });
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return json(400, { ok: false, error: "Zły JSON" }); }

      const id = payload.id;
      if (!id) return json(400, { ok: false, error: "id required" });

      // znajdź klucz po id
      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null;
      let data = null;
      for (const b of blobs || []) {
        const item = await store.get(b.key, { type: "json" });
        if (item?.id === id) { foundKey = b.key; data = item; break; }
      }
      if (!foundKey || !data) return json(404, { ok: false, error: "not found" });

      if (typeof payload.body === "string") {
        data.body = payload.body;
        data.edited_at = new Date().toISOString();
      }
      if (payload.reaction) {
        data.reactions = data.reactions || {};
        data.reactions[payload.reaction] = (data.reactions[payload.reaction] || 0) + 1;
      }
      await store.setJSON(foundKey, data);
      return json(200, { ok: true });
    }

    // DELETE (soft delete)
    if (event.httpMethod === "DELETE") {
      const url = new URL(event.rawUrl || http://x${event.path}${event.queryString ? "?" + event.queryString : ""});
      const id = url.searchParams.get("id");
      if (!id) return json(400, { ok: false, error: "id required" });

      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null;
      let data = null;
      for (const b of blobs || []) {
        const item = await store.get(b.key, { type: "json" });
        if (item?.id === id) { foundKey = b.key; data = item; break; }
      }
      if (!foundKey || !data) return json(404, { ok: false, error: "not found" });

      data.deleted_at = new Date().toISOString();
      data.body = "[usunięto]";
      await store.setJSON(foundKey, data);
      return json(200, { ok: true });
    }

    return json(405, { ok: false, error: "Method Not Allowed" });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
