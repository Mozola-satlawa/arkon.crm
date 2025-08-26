// netlify/functions/contracts.js
import { getStore } from "@netlify/blobs";

// Uniwersalne CORS
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});
const ok = (body = {}) => json(200, body);
const bad = (msg = "Bad Request") => json(400, { error: msg });
const notFound = () => json(404, { error: "Not found" });

// Czyści i zwraca ID z końca ścieżki po /.netlify/functions/<fn>/
function getIdFromPath(path, functionName) {
  const base = /.netlify/functions/${functionName}/;
  const baseNoSlash = /.netlify/functions/${functionName};
  if (path === baseNoSlash || path === ${baseNoSlash}/) return null;
  const idx = path.indexOf(base);
  if (idx === -1) return null;
  return path.slice(idx + base.length).replace(/^\/+/, "");
}

// Losowe ID
const rid = (p = "") =>
  ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)};

export async function handler(event) {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  // Nazwa funkcji = nazwa pliku (bez .js)
  const FN = "contracts";
  const store = getStore("contracts"); // nazwa "sklepu" (namespace) w Blobs

  try {
    // LISTA: GET /api/contracts
    // (po przekierowaniu w netlify.toml → /.netlify/functions/contracts)
    if (event.httpMethod === "GET" && (
        event.path.endsWith(/${FN}) ||
        event.path.endsWith(/${FN}/)
      )) {
      const { blobs } = await store.list();
      // blobs: [{ key, etag }]
      return ok({ items: blobs });
    }

    // GET /api/contracts/:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path, FN);
      if (!id) return bad("Brak ID");
      const data = await store.get(id, { type: "json" });
      if (data === null) return notFound();
      return ok({ id, ...data });
    }

    // CREATE: POST /api/contracts   body: {title, content, parties, status}
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      let payload = {};
      try { payload = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      const id = rid("c_");
      const now = Date.now();
      await store.setJSON(id, {
        id,
        title: payload.title || "Bez tytułu",
        content: payload.content || "",
        parties: Array.isArray(payload.parties) ? payload.parties : [],
        status: payload.status || "draft",
        created_at: now,
        updated_at: now
      });
      return ok({ id, created: true });
    }

    // UPDATE: PUT/PATCH /api/contracts/:id
    if (event.httpMethod === "PUT" || event.httpMethod === "PATCH") {
      const id = getIdFromPath(event.path, FN);
      if (!id) return bad("Brak ID");
      const prev = await store.get(id, { type: "json" });
      if (prev === null) return notFound();

      let patch = {};
      if (event.body) {
        try { patch = JSON.parse(event.body); } catch { return bad("Niepoprawny JSON"); }
      }
      const next = { ...prev, ...patch, id, updated_at: Date.now() };
      await store.setJSON(id, next);
      return ok({ id, updated: true });
    }

    // DELETE: DELETE /api/contracts/:id
    if (event.httpMethod === "DELETE") {
      const id = getIdFromPath(event.path, FN);
      if (!id) return bad("Brak ID");
      await store.delete(id);
      return ok({ id, deleted: true });
    }

    return bad("Nieobsługiwany endpoint");
  } catch (e) {
    return json(500, { error: e?.message || String(e) });
  }
}
