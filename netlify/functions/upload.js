// Netlify Function: upload załączników do Netlify Blobs
import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try {
    // Odbieramy multipart/form-data (Netlify daje base64 w event.body)
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Wymagane multipart/form-data (pole 'file')" }) };
    }

    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": contentType }, body: raw });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Pole 'file' wymagane" }) };
    }

    const room = (form.get("room") || "global").toString().trim();
    const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const key = uploads/${encodeURIComponent(room)}/${ts}-${crypto.randomUUID()}.${ext};

    const store = getStore("chat-uploads");
    await store.set(key, await file.arrayBuffer(), {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", room }
    });

    // Publiczny URL do pobrania pliku:
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};

    return {
      statusCode: 201,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, url, key })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: e?.message || String(e) })
    };
  }
}
