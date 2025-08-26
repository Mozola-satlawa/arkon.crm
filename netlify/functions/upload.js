import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const ok = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});

export async function handler(event) {
  // preflight
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST") return ok(405, { error: "Method Not Allowed" });

  try {
    const store = getStore("chat-uploads");

    // Parsowanie multipart/form-data w Node 18 (Web API)
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return ok(400, { error: "Wymagane multipart/form-data (pole 'file')." });
    }
    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    const req = new Request("http://local/upload", { method: "POST", headers: { "content-type": contentType }, body: raw });
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return ok(400, { error: "Pole 'file' jest wymagane." });
    }

    const ext = String((file.name || "bin").split(".").pop() || "bin").toLowerCase();
    const key = uploads/${Date.now()}-${crypto.randomUUID()}.${ext};
    const buf = await file.arrayBuffer();

    await store.set(key, buf, {
      metadata: { name: file.name || "", type: file.type || "application/octet-stream", size: file.size || 0 }
    });

    // publiczny URL przez Blobs gateway
    const url = /.netlify/blobs/${encodeURIComponent("chat-uploads")}/${encodeURIComponent(key)};
    return ok(201, { ok: true, url, key });
  } catch (e) {
    return ok(500, { ok: false, error: e?.message || String(e) });
  }
}
