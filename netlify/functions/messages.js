// /.netlify/functions/messages
import { getStore } from "@netlify/blobs";

/**
 * API:
 *  GET  /api/messages?room=global&since=timestamp_ms
 *  POST /api/messages { room, author, body, fileUrl? }  (Authorization: Bearer <CHAT_POST_TOKEN>)
 *
 * Magazyn:
 *  - store "chat"
 *  - log per pokój:  room/<room>.jsonl  (JSON Lines)
 *  - cache head:     room/<room>-head.json  (ostatnie N=50)
 */

const STORE_NAME = "chat";
const HEAD_COUNT = 50;
const POST_TOKEN = process.env.CHAT_POST_TOKEN || ""; // Ustaw w Netlify → Site configuration → Environment variables

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });

export default async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  const store = await getStore({ name: STORE_NAME });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "global").trim();
    const since = Number(url.searchParams.get("since") || 0);

    const headKey = room/${room}-head.json;
    const logKey = room/${room}.jsonl;

    // domyślnie zwróć head (ostatnie N)
    let messages = [];
    const headRaw = await store.get(headKey);
    if (headRaw) {
      try { messages = JSON.parse(headRaw); } catch { messages = []; }
    }

    // jeśli klient poda since — dociągnij nowsze z pełnego loga
    if (since > 0) {
      const logRaw = await store.get(logKey);
      if (logRaw) {
        messages = logRaw
          .split("\n")
          .filter(Boolean)
          .map((ln) => { try { return JSON.parse(ln); } catch { return null; } })
          .filter((m) => m && m.ts > since);
      } else {
        messages = [];
      }
    }

    return json({ room, count: messages.length, messages });
  }

  if (req.method === "POST") {
    // Proste zabezpieczenie tokenem
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!POST_TOKEN || token !== POST_TOKEN) {
      return json({ error: "Unauthorized" }, 401);
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Zły JSON" }, 400);
    }

    const room = (payload.room || "global").trim();
    const author = (payload.author || "Anon").trim().slice(0, 40);
    const body = (payload.body || "").toString().trim();
    const fileUrl = payload.fileUrl ? String(payload.fileUrl) : null;

    if (!body && !fileUrl) return json({ error: "Wiadomość lub plik wymagany" }, 400);

    const msg = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      room,
      author,
      body,
      fileUrl
    };

    const headKey = room/${room}-head.json;
    const logKey = room/${room}.jsonl;

    // dopisz do loga
    await store.append(logKey, JSON.stringify(msg) + "\n");

    // zaktualizuj head (ostatnie N)
    let head = [];
    const headRaw = await store.get(headKey);
    if (headRaw) {
      try { head = JSON.parse(headRaw); } catch { head = []; }
    }
    head.push(msg);
    if (head.length > HEAD_COUNT) head = head.slice(-HEAD_COUNT);
    await store.set(headKey, JSON.stringify(head));

    return json({ ok: true, message: msg });
  }

  return json({ error: "Method not allowed" }, 405, { "Allow": "GET,POST,OPTIONS" });
}
