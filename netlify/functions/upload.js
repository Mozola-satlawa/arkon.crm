import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const store = getStore("chat-uploads");

const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }

  try {
    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!ct.toLowerCase().startsWith("multipart/form-data")) {
      return json(400, { ok: false, error: "Wymagane multipart/form-data (pole 'file')" });
    }
    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": ct }, body: raw });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json(400, { ok: false, error: "Pole 'file' nie znalezione" });
    }
    const room = String(form.get("room") || "global").toLowerCase();
    const ext = (String(file.name || "").split(".").pop() || "bin").toLowerCase();
    const key = `uploads/${room}/${Date.now()}-${crypto.randomUUID().slice(0,8)}.${ext}`;

    const buf = await file.arrayBuffer();
    await store.set(key, buf, {
      metadata: {
        name: file.name || "",
        type: file.type || "application/octet-stream",
        room
      }
    });

    const url = `/.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)}`;
    return json(201, { ok: true, url, key });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
