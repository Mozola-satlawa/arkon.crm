import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});
const ok = (body = {}) => json(200, body);
const bad = (msg = "Bad Request") => json(400, { error: msg });
const notFound = () => json(404, { error: "Not found" });
const getIdFromPath = (path, functionName) => {
  const idx = path.indexOf(/.netlify/functions/${functionName}/);
  if (idx === -1) return null;
  return path.slice(idx + (/.netlify/functions/${functionName}/).length);
};
const rid = (p="") => ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const store = getStore("contracts");

  try {
    // LISTA
    if (event.httpMethod === "GET" && event.path.endsWith("/contracts")) {
      const { blobs } = await store.list();
      return ok({ items: blobs }); // [{key, etag}]
    }

    // GET /:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path, "contracts");
      if (!id) return bad("Brak ID");
      const data = await store.get(id, { type: "json" });
      if (data === null) return notFound();
      return ok({ id, ...data });
    }

    // CREATE POST /
    if (event.httpMethod === "POST") {
      if (!event.body) return bad("Brak body");
      const payload = JSON.parse(event.body); // {title, content, parties, ...}
      const id = rid("c_");
      await store.setJSON(id, {
        id,
        title: payload.title || "Bez tytułu",
        content: payload.content || "",
        parties: payload.parties || [],
        created_at: Date.now(),
        updated_at: Date.now(),
        status: payload.status || "draft"
      });
      return ok({ id });
    }

    // UPDATE PUT/PATCH /:id
    if (event.httpMethod === "PUT" || event.httpMethod === "PATCH") {
      const id = getIdFromPath(event.path, "contracts");
      if (!id) return bad("Brak ID");
      const prev = await store.get(id, { type: "json" });
      if (prev === null) return notFound();
      const patch = event.body ? JSON.parse(event.body) : {};
      const next = { ...prev, ...patch, id, updated_at: Date.now() };
      await store.setJSON(id, next);
      return ok({ id, updated: true });
    }

    // DELETE /:id
    if (event.httpMethod === "DELETE") {
      const id = getIdFromPath(event.path, "contracts");
      if (!id) return bad("Brak ID");
      await store.delete(id);
      return ok({ id, deleted: true });
    }

    return bad("Nieobsługiwany endpoint");
  } catch (e) {
    return json(500, { error: e.message || String(e) });
  }
}
