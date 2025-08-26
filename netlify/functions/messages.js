
// Chat messages API — Netlify Blobs
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const j = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b = {}) => j(200, b);
const bad = (m = "Bad Request") => j(400, { error: m });
const notFound = () => j(404, { error: "Not found" });

// store: pojedyncza "tabela" na wiadomości
const store = getStore("chat-messages");

// Klucz w Blobs: room/<room>/<ISO>-<id>.json
const keyFor = (room, iso, id) => room/${room}/${iso}-${id}.json;
const rid = (p = "") => ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  try {
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl || event.url);
      const room = url.searchParams.get("room") || "global";
      const before = url.searchParams.get("before"); // ISO opcjonalnie

      // pobierz listę pod prefixem danego pokoju
      const { blobs } = await store.list({ prefix: room/${room}/ });

      const items = [];
      for (const b of blobs) {
        const msg = await store.get(b.key, { type: "json" });
        if (!msg) continue;
        if (before && (msg.created_at || "") >= before) continue; // tylko starsze, jeśli paginacja
        items.push(msg);
      }
      // rosnąco po czasie
      items.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      return ok({ items, oldest: items[0]?.created_at || null });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try {
        payload = JSON.parse(event.body);
      } catch {
        return bad("Niepoprawny JSON");
      }
      const room = String(payload.room || "global");
      const author = String(payload.author || "Anon");
      const body = String(payload.body || "");
      const file_url = payload.file_url ? String(payload.file_url) : null;
      const parent_id = payload.parent_id || null;

      const now = new Date().toISOString();
      const id = rid("m_");
      const item = {
        id,
        room_id: room,
        author,
        body,
        file_url,
        parent_id,
        created_at: now,
        reactions: {}
      };

      await store.setJSON(keyFor(room, now, id), item);
      return j(201, { ok: true, item });
    }

    if (event.httpMethod === "PATCH") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      const { id, body, reaction } = payload;
      if (!id) return bad("id required");

      // nie znamy klucza -> przeszukaj wszystkie pokoje
      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null, msg = null;

      for (const b of blobs) {
        const m = await store.get(b.key, { type: "json" });
        if (m?.id === id) { foundKey = b.key; msg = m; break; }
      }
      if (!foundKey || !msg) return notFound();

      if (typeof body === "string") {
        msg.body = body;
        msg.edited_at = new Date().toISOString();
      }
      if (reaction) {
        msg.reactions = msg.reactions || {};
        msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
      }

      await store.setJSON(foundKey, msg);
      return ok({ ok: true });
    }

    if (event.httpMethod === "DELETE") {
      const url = new URL(event.rawUrl || event.url);
      const id = url.searchParams.get("id");
      if (!id) return bad("id required");

      const { blobs } = await store.list({ prefix: "room/" });
      let foundKey = null, msg = null;

      for (const b of blobs) {
        const m = await store.get(b.key, { type: "json" });
        if (m?.id === id) { foundKey = b.key; msg = m; break; }
      }
      if (!foundKey || !msg) return notFound();

      msg.deleted_at = new Date().toISOString();
      msg.body = "[usunięto]";
      await store.setJSON(foundKey, msg);
      return ok({ ok: true });
    }

    return j(405, { error: "Method not allowed" });
  } catch (e) {
    return j(500, { error: e?.message || String(e) });
  }
}
