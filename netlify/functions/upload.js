import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body={}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});
const ok  = (body={}) => json(200, body);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

  const store = getStore("uploads");

  try {
    const form = await event.body; // w Netlify Functions binary/form-data obsługa bywa tricky
    // uproszczenie: pliki najlepiej wrzucać przez klienta JS używając supabase-like albo API Blobs
    // tu wersja minimalna:

    // UWAGA: Netlify Functions nie parsują FormData out-of-the-box!
    // Najprościej: użyj endpointu Blobs bezpośrednio z frontu:
    //   const store = getStore("uploads")
    //   await store.set("room/file.png", file)
    // Albo użyj lib "busboy" w function.

    return ok({ url: "TODO - bezpośredni upload do Blobs (do poprawki)" });
  } catch (e) {
    return json(500, { error: e.message });
  }
}
