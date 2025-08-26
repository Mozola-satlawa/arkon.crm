// netlify/functions/tasks.js
import { getStore } from "@netlify/blobs";

/**
 * Prosty CRUD zadań (tasks) na Netlify Blobs
 * Klucze: tasks/<YYYY-MM>/<id>.json
 * Struktura rekordu:
 * {
 *   id, title, description, status, room, assignee, due_at,
 *   created_at, updated_at, tags:[]
 * }
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const send = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b = {}) => send(200, b);
const bad = (m = "Bad Request") => send(400, { error: m });
const notFound = () => send(404, { error: "Not found" });

const ymPrefix = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return ${y}-${m};
};

const rid = (p = "") =>
  ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)};

// wyciąga ID z końca ścieżki po /.netlify/functions/<fn>/
function getIdFromPath(path, fnName) {
  const base = /.netlify/functions/${fnName}/;
  const bare = /.netlify/functions/${fnName};
  if (path === bare || path === ${bare}/) return null;
  const idx = path.indexOf(base);
  if (idx === -1) return null;
  return path.slice(idx + base.length).replace(/^\/+/, "");
}

function sanitizeTask(input = {}) {
  const t = {};
  if (input.title != null) t.title = String(input.title).trim();
  if (input.description != null) t.description = String(input.description);
  if (input.status != null) t.status = String(input.status); // np. todo/in-progress/done/cancelled
  if (input.room != null) t.room = String(input.room);       // np. "global" lub ID pokoju
  if (input.assignee != null) t.assignee = String(input.assignee);
  if (input.due_at != null) t.due_at = String(input.due_at); // ISO lub ""
  if (input.tags != null) {
    t.tags = Array.isArray(input.tags)
      ? input.tags.map(x => String(x)).slice(0, 50)
      : String(input.tags).split(",").map(s => s.trim()).filter(Boolean);
  }
  return t;
}

export async function handler(event) {
  // preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const FN = "tasks";
  const store = getStore("tasks"); // namespace w Blobs

  try {
    // === LISTA: GET /api/tasks?[room=...][&status=...]
    if (event.httpMethod === "GET" && (
      event.path.endsWith(/${FN}) || event.path.endsWith(/${FN}/)
    )) {
      const url = new URL(event.rawUrl || http://x${event.path});
      const room = url.searchParams.get("room") || "";   // opcjonalny filtr
      const status = url.searchParams.get("status") || ""; // opcjonalny filtr

      // pobierz do 1000 z bieżących i ostatnich kilku miesięcy (prosto)
      const prefixes = [ymPrefix()];
      // dodaj jeszcze 2 poprzednie miesiące (lekki zasięg bez paginacji)
      const now = new Date();
      for (let i = 1; i <= 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        prefixes.push(${y}-${m});
      }

      const items = [];
      for (const pref of prefixes) {
        const { blobs } = await store.list({ prefix: tasks/${pref}/ });
        for (const b of blobs || []) {
          const obj = await store.get(b.key, { type: "json" });
          if (!obj) continue;
          if (room && obj.room !== room) continue;
          if (status && obj.status !== status) continue;
          items.push(obj);
        }
      }

      // sortuj po updated_at malejąco
      items.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
      return ok({ items });
    }

    // === GET: /api/tasks/:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path, FN);
      if (!id) return bad("Brak ID");
      // sprawdzamy w kilku prefiksach, żeby nie musieć znać YM
      const prefixes = [ymPrefix()];
      const now = new Date();
      for (let i = 1; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        prefixes.push(${y}-${m});
      }
      for (const pref of prefixes) {
        const key = tasks/${pref}/${id}.json;
        const obj = await store.get(key, { type: "json" });
        if (obj) return ok(obj);
      }
      return notFound();
    }

    // === CREATE: POST /api/tasks
    // body: { title (wymagane), description?, status?, room?, assignee?, due_at?, tags?[] }
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      if (!payload.title) return bad("Pole 'title' jest wymagane");

      const nowISO = new Date().toISOString();
      const id = rid("t_");
      const ym = ymPrefix();

      const base = {
        id,
        title: String(payload.title).trim(),
        description: String(payload.description || ""),
        status: payload.status || "todo",
        room: payload.room || "global",
        assignee: payload.assignee || "",
        due_at: payload.due_at || "",
        tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
        created_at: nowISO,
        updated_at: nowISO
      };

      const key = tasks/${ym}/${id}.json;
      await store.setJSON(key, base);
      return send(201, { id, created: true });
    }

    // === UPDATE: PATCH /api/tasks/:id
    if (event.httpMethod === "PATCH") {
      const id = getIdFromPath(event.path, FN);
      if (!id) return bad("Brak ID");
      if (!event.body) return bad("Brak body");
      let patch = {};
      try { patch = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }

      // odszukaj (nie znamy prefiksu – skanujemy parę miesięcy)
      const prefixes = [ymPrefix()];
      const now = new Date();
      for (let i = 1; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        prefixes.push(${y}-${m});
      }

      let foundKey = null;
      let data = null;

      for (const pref of prefixes) {
        const key = tasks/${pref}/${id}.json;
        const obj = await store.get(key, { type: "json" });
        if (obj) { foundKey = key; data = obj; break; }
      }
      if (!foundKey || !data) return notFound();

      const safe = sanitizeTask(patch);
      const next = { ...data, ...safe, id, updated_at: new Date().toISOString() };
      await store.setJSON(foundKey, next);
      return ok({ id, updated: true });
    }

    // === DELETE: /api/tasks/:id
    if (event.httpMethod === "DELETE") {
      const id = getIdFromPath(event.path, FN);
      if (!id) return bad("Brak ID");

      // identyczne szukanie jak w PATCH
      const prefixes = [ymPrefix()];
      const now = new Date();
      for (let i = 1; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        prefixes.push(${y}-${m});
      }

      for (const pref of prefixes) {
        const key = tasks/${pref}/${id}.json;
        const obj = await store.get(key, { type: "json" });
        if (obj) {
          await store.delete(key);
          return ok({ id, deleted: true });
        }
      }
      return notFound();
    }

    return send(405, { error: "Method not allowed" });
  } catch (e) {
    return send(500, { error: e?.message || String(e) });
  }
}
