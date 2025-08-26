// POST /api/upload   (multipart/form-data; pole "file")
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (s, b) => ({
  statusCode: s,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(b)
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return json(400, { ok: false, error: "Wymagane multipart/form-data z polem 'file'" });
    }

    // z surowego body budujemy Request, żeby dostać FormData (działa na Netlify)
    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": contentType }, body: raw });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json(400, { ok: false, error: "Pole 'file' nie znalezione" });
    }

    const store = getStore("chat-uploads");
    const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
    const key = uploads/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${ext};
    await store.set(key, await file.arrayBuffer(), {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", size: file.size || 0 }
    });

    // publiczny adres przez Blobs Router:
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};
    return json(201, { ok: true, url, key });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
