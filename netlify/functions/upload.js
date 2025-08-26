
// netlify/functions/upload.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const res = (status, body, extra = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  body: JSON.stringify(body ?? {}),
});
const bad = (msg) => res(400, { ok: false, error: msg });
const ok = (body) => res(200, { ok: true, ...body });

const store = getStore("chat-uploads");

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") return res(405, { ok: false, error: "Method Not Allowed" });

  try {
    // Parsowanie multipart/form-data przy użyciu Web Request (z event.body)
    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!ct.startsWith("multipart/form-data")) return bad("Wymagane multipart/form-data (pole 'file')");

    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": ct }, body: raw });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return bad("Pole 'file' nie znalezione");

    const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
    const key = uploads/${Date.now()}-${crypto.randomUUID()}.${ext};

    await store.set(key, await file.arrayBuffer(), {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", size: file.size || 0 },
    });

    // publiczny URL do Blobs
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};
    return res(201, { ok: true, url });
  } catch (e) {
    return res(500, { ok: false, error: e?.message || String(e) });
  }
}
