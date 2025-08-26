// REST: GET /api/tasks        → lista
//       POST /api/tasks       → {title, done=false, room?, assignee?}
//       PATCH /api/tasks/:id  → nadpisanie pól
//       DELETE /api/tasks/:id
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json", ...CORS }, body: JSON.stringify(b) });
const ok = (b = {}) => json(200, b);
const bad = (m = "Bad Request") => json(400, { error: m });

function getIdFromPath(path, fn) {
  const base = /.netlify/functions/${fn}/;
  const i = path.indexOf(base);
  if (i === -1) return null;
  return decodeURIComponent(path.slice(i + base.length));
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  const store = getStore("tasks");

  try {
    // lista
    if (event.httpMethod === "GET" && (event.path.endsWith("/tasks") || event.path.endsWith("/tasks/"))) {
      const { blobs } = await store.list();
      const items = [];
      for (const b of blobs) {
        const t = await store.get(b.key, { type: "json" });
        if (t) items.push(t);
      }
      items.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      return ok({ items });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let p = {};
      try { p = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      const id = t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)};
      const rec = {
        id,
        title: p.title || "Zadanie",
        done: !!p.done,
        room: p.room || "global",
        assignee: p.assignee || "",
        created_at: Date.now(),
        updated_at: Date.now()
      };
      await store.setJSON(id, rec);
      return json(201, { id });
    }

    if (event.httpMethod === "PATCH") {
      const id = getIdFromPath(event.path, "tasks");
      if (!id) return bad("Brak ID");
      const prev = await store.get(id, { type: "json" });
      if (!prev) return json(404, { error: "Not found" });
      let patch = {};
      try { patch = event.body ? JSON.parse(event.body) : {}; } catch { return bad("Niepoprawny JSON"); }
      await store.setJSON(id, { ...prev, ...patch, id, updated_at: Date.now() });
      return ok({ id, updated: true });
    }

    if (event.httpMethod === "DELETE") {
      const id = getIdFromPath(event.path, "tasks");
      if (!id) return bad("Brak ID");
      await store.delete(id);
      return ok({ id, deleted: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    return json(500, { error: e?.message || String(e) });
  }
}
