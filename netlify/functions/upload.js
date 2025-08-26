// netlify/functions/upload.js
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "Method Not Allowed" }) };
  }

  try {
    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    const boundary = ct.split("boundary=")[1];
    if (!boundary) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Brak boundary (multipart/form-data)" }) };
    }

    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": ct }, body: raw });
    const form = await req.formData();
    const file = form.get("file");
    if (!file) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Pole 'file' jest wymagane" }) };
    }

    const store = getStore("chat-uploads");
    const safe = (name) => String(name || "plik").replace(/[^\w.\-]+/g, "_");
    const key = uploads/${Date.now()}-${safe(file.name)};

    await store.set(key, await file.arrayBuffer(), {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", size: file.size || 0 }
    });

    // Publiczny URL do pobrania:
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};

    return { statusCode: 201, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, url, key }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
}
