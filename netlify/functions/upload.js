// /.netlify/functions/upload
import { getStore } from "@netlify/blobs";

/**
 * POST multipart/form-data:
 *   field "file"  (dowolny typ)
 * Zwraca { url } do wstawienia w wiadomości.
 *
 * Zabezpieczenie tym samym tokenem co POST /messages.
 */
const STORE_NAME = "chat";
const POST_TOKEN = process.env.CHAT_POST_TOKEN || "";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store"
    }
  });

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!POST_TOKEN || token !== POST_TOKEN) return json({ error: "Unauthorized" }, 401);

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "Brak pliku" }, 400);
  }

  const store = await getStore({ name: STORE_NAME });
  const extGuess =
    (file.name && file.name.includes(".") ? file.name.split(".").pop() : "bin");
  const key = uploads/${Date.now()}-${crypto.randomUUID()}.${extGuess};

  // zapis jako blob
  await store.set(key, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type || "application/octet-stream"
  });

  // publiczny URL blobów Netlify (idzie przez CDN)
  const base = https://${process.env.URL || process.env.DEPLOY_PRIME_URL || ""}.replace(/\/$/, "");
  const url = ${base}/.netlify/blobs/${encodeURI(key)};

  return json({ ok: true, url, key });
}
