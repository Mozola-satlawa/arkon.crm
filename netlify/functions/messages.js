// Netlify Function: czat (paginacja: ?room=&before=&limit=)
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (body = {}) => json(200, body);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  const store = getStore("chat-messages"); // namespace w Netlify Blobs

  try {
    // LIST: GET /api/messages?room=&before=&limit=
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl || https://x${event.path}${event.queryString ? "?" + event.queryStringParameters : ""});
      const room   = (url.searchParams.get("room") || "global").trim();
      const before = (url.searchParams.get("before") || "").trim(); // ISO string
      const limit  = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10)));

      const prefix = room/${encodeURIComponent(room)}/;

      // Pobieramy listę kluczy pod prefixem (maks. ~1000 na raz).
      // Dla prostoty wczytujemy wszystko i filtrujemy po created_at (dane w pliku).
      const { blobs } = await store.list({ prefix });

      // Wczytaj JSON dla każdego klucza (najwyżej 1000; jeśli masz więcej – polecam kursory store.list({paginate:true}))
      const items = [];
      for (const b of blobs) {
        const doc = await store.get(b.key, { type: "json" });
        if (!doc) continue;
        // Filtr "before": zwracamy tylko STARSZE niż znacznik
        if (before && doc.created_at && String(doc.created_at) >= before) continue;
        items.push(doc);
      }

      // sortuj rosnąco po czasie i przytnij do limitu od KOŃCA (czyli najnowsze w dół)
      items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

      let page = items.slice(-limit); // ostatnie "limit"
      // jeśli jest 'before', to bierzemy ostatnie limit już po filtrze
      if (before) {
        page = items.slice(-limit);
      }

      // Zwracamy w kolejności rosnącej (od najstarszej w stronę nowszych)
      const oldest = page[0]?.created_at || null;
      const newest = page[page.length - 1]?.created_at || null;

      return ok({ messages: page, oldest, newest, count: page.length });
    }

    // CREATE: POST /api/messages   body: { room, author, text, file_url?, parent_id? }
    if (event.httpMethod === "POST") {
      if (!event.body) return json(400, { error: "Brak body" });
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return json(400, { error: "Zły JSON" }); }

      const room = (payload.room || "global").trim();
      const author = String(payload.author || "Anon");
      const body   = String(payload.text || "");
      const fileUrl = payload.file_url ? String(payload.file_url) : null;
      const parentId = payload.parent_id ? String(payload.parent_id) : null;

      const nowISO = new Date().toISOString();
      const id = ${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)};
      const rec = {
        id,
        room_id: room,
        author,
        body,
        file_url: fileUrl,
        parent_id: parentId,
        created_at: nowISO,
        reactions: {}
      };

      const key = room/${encodeURIComponent(room)}/${nowISO}-${id}.json;
      await store.setJSON(key, rec);

      return json(201, { ok: true, item: rec });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (e) {
    return json(500, { error: e?.message || String(e) });
  }
}
