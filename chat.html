// Upload załączników do Netlify Blobs (chat-uploads)
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const j = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b = {}) => j(200, b);
const bad = (m = "Bad Request") => j(400, { error: m });

const store = getStore("chat-uploads");
const rid = (p = "") => ${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") return j(405, { error: "Method not allowed" });

  try {
    // Netlify Functions dostaje body (często base64). Użyjmy Web API, żeby sparsować form-data
    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!ct.startsWith("multipart/form-data")) return bad("Wymagane multipart/form-data z polem 'file'");

    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": ct }, body: raw });
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") return bad("Pole 'file' nie znalezione");

    const room = String(form.get("room") || "global");
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const key = uploads/${room}/${new Date().toISOString().replace(/[:.]/g, "-")}-${rid()}.${ext};

    const buf = await file.arrayBuffer();
    await store.set(key, buf, {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", size: file.size || 0 }
    });

    // Publiczny URL do assetu w Blobs (ten sam origin)
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};

    return j(201, {
      ok: true,
      key,
      url,            // frontend wstawi to jako file_url w wiadomości
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size || 0
    });
  } catch (e) {
    return j(500, { error: e?.message || String(e) });
  }
}
