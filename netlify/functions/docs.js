import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
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
  return decodeURIComponent(path.slice(idx + (/.netlify/functions/${functionName}/).length));
};
const rid = (p="") => ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const store = getStore("docs");

  try {
    // LISTA
    if (event.httpMethod === "GET" && event.path.endsWith("/docs")) {
      const { blobs, directories } = await store.list({ directories: true });
      return ok({ blobs, directories });
    }

    // POBIERZ /:key (binarnie)
    if (event.httpMethod === "GET") {
      const key = getIdFromPath(event.path, "docs");
      if (!key) return bad("Brak klucza");
      const data = await store.get(key, { type: "arrayBuffer" });
      if (data === null) return notFound();
      return {
        statusCode: 200,
        headers: {
          ...CORS,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": attachment; filename="${key.split("/").pop() || "file"}"
        },
        body: Buffer.from(data).toString("base64"),
        isBase64Encoded: true
      };
    }

    // UPLOAD (multipart/form-data) – pole "file"
    if (event.httpMethod === "POST") {
      const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
      if (!contentType.startsWith("multipart/form-data")) {
        return bad("Wymagane multipart/form-data z polem 'file'");
      }

      // Netlify Functions nie parsują multipart – użyjemy Web API Request:
      const boundary = contentType.split("boundary=")[1];
      if (!boundary) return bad("Brak boundary w nagłówku Content-Type");

      // Z event.body (base64) zrobimy Request i FormData
      const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
      const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": contentType }, body: raw });
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") {
        return bad("Pole 'file' nie znalezione");
      }

      const buf = await file.arrayBuffer();
      const key = uploads/${rid()}-${(file.name || "plik").replace(/\s+/g, "_")};
      await store.set(key, buf, { metadata: { name: file.name || "", size: file.size || 0 } });

      return ok({ key });
    }

    // DELETE /:key
    if (event.httpMethod === "DELETE") {
      const key = getIdFromPath(event.path, "docs");
      if (!key) return bad("Brak klucza");
      await store.delete(key);
      return ok({ key, deleted: true });
    }

    return bad("Nieobsługiwany endpoint");
  } catch (e) {
    return json(500, { error: e.message || String(e) });
  }
}
