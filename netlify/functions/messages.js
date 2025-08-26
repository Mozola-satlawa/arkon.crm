
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body={}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});
const ok  = (body={}) => json(200, body);
const bad = (msg="Bad Request") => json(400, { error: msg });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  const store = getStore("messages");

  try {
    // GET /api/messages?room=xxx
    if (event.httpMethod === "GET") {
      const room = event.queryStringParameters.room || "global";
      const { blobs } = await store.list({ prefix: ${room}/ });
      const msgs = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: "json" });
        if (data) msgs.push(data);
      }
      msgs.sort((a,b)=> new Date(a.created_at)-new Date(b.created_at));
      return ok(msgs);
    }

    // POST /api/messages
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      const body = JSON.parse(event.body);
      const room = body.room || "global";
      const id = ${room}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.json;
      const msg = {
        id,
        room_id: room,
        author: body.author || "Anon",
        body: body.text || "",
        file_url: body.file_url || null,
        parent_id: body.parent_id || null,
        created_at: new Date().toISOString()
      };
      await store.setJSON(id, msg);
      return ok(msg);
    }

    return bad("Nieobsługiwany endpoint");
  } catch(e) {
    return json(500, { error: e.message });
  }
}
