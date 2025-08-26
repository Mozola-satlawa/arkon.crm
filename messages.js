import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (body = {}) => json(200, body);
const bad = (msg = "Bad Request") => json(400, { ok: false, error: msg });
const notFound = () => json(404, { ok: false, error: "Not found" });

const store = getStore("chat-messages");

const rid = (p = "") =>
  `${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function pathPrefix(room) {
  const r = (room || "global").toLowerCase();
  return `room/${r}/`;
}
function looksLikeUrl(s = "") {
  return /^https?:\/\/\S+/i.test(String(s));
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  try {
    if (event.httpMethod === "GET") {
      const room = (event.queryStringParameters?.room || "global").trim() || "global";
      const before = event.queryStringParameters?.before || null;

      const prefix = pathPrefix(room);
      const { blobs } = await store.list({ prefix });
      const items = [];

      for (const b of blobs || []) {
        const obj = await store.get(b.key, { type: "json" });
        if (!obj) continue;
        if (before && (obj.created_at || "") >= before) continue;
        items.push(obj);
      }

      items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
      return ok({ items, oldest: items[0]?.created_at || null });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }

      const room = (payload.room || "global").trim() || "global";
      const nowIso = new Date().toISOString();
      const id = `${Date.now().toString(36)}_${crypto.randomUUID()}`;

      let bodyTxt = String(payload.body || "");
      let fileUrl = payload.fileUrl || null;
      if (!fileUrl && looksLikeUrl(bodyTxt)) {
        fileUrl = bodyTxt; bodyTxt = "";
      }

      const rec = {
        id,
        room_id: room,
        author: payload.author || "Anon",
        body: bodyTxt,
        file_url: fileUrl || null,
        parent_id: payload.parentId || null,
        created_at: nowIso,
        reactions: {}
      };

      const key = `${pathPrefix(room)}${nowIso}-${id}.json`;
      await store.setJSON(key, rec);
      return json(201, { ok: true, item: rec });
    }

    if (event.httpMethod === "PATCH") {
      if (!event.body) return bad("Brak body");
      let patch = {};
      try { patch = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      const id = patch.id;
      if (!id) return bad("Wymagane: id");

      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null, data = null;
      for (const b of blobs || []) {
        const obj = await store.get(b.key, { type: "json" });
        if (obj?.id === id) { foundKey = b.key; data = obj; break; }
      }
      if (!foundKey || !data) return notFound();

      if (typeof patch.body === "string") { data.body = patch.body; data.edited_at = new Date().toISOString(); }
      if (patch.reaction) { data.reactions = data.reactions || {}; data.reactions[patch.reaction] = (data.reactions[patch.reaction] || 0) + 1; }

      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) return bad("Wymagane: id");

      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null, data = null;
      for (const b of blobs || []) {
        const obj = await store.get(b.key, { type: "json" });
        if (obj?.id === id) { foundKey = b.key; data = obj; break; }
      }
      if (!foundKey || !data) return notFound();

      data.deleted_at = new Date().toISOString();
      data.body = "[usunięto]";
      await store.setJSON(foundKey, data);
      return ok({ ok: true });
    }

    return bad("Nieobsługiwany endpoint");
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
