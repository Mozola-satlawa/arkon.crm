// netlify/functions/upload.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const send = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") return send(405, { error: "Method Not Allowed" });

  try {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return send(400, { error: "Wymagane multipart/form-data z polem 'file'" });
    }

    // Z event.body (base64) tworzymy Request i parsujemy FormData
    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": contentType }, body: raw });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return send(400, { error: "Pole 'file' nie znalezione" });
    }

    const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
    const key = uploads/${Date.now()}-${crypto.randomUUID()}.${ext};

    const store = getStore("chat-uploads");
    await store.set(key, await file.arrayBuffer(), {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", size: file.size || 0 }
    });

    // Publiczny URL do pobrania (Netlify Blobs)
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};

    return send(201, { ok: true, url, key });
  } catch (e) {
    return send(500, { ok: false, error: e?.message || String(e) });
  }
}
