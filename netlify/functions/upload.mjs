import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const uploads = getStore("files"); // nazwa store "files"
    const body = event.body || "brak danych";

    const key = "test-" + Date.now(); // unikalny klucz
    await uploads.set(key, body, { contentType: "text/plain" });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, key })
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
