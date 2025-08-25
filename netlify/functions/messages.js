
import { getStore } from "@netlify/blobs";

export async function handler(event) {
  const store = getStore("chat"); // tworzy/zapisuje w store "chat"
  const key = "rooms/global.json";

  if (event.httpMethod === "GET") {
    const data = await store.get(key, { type: "json" });
    return {
      statusCode: 200,
      body: JSON.stringify(data || { items: [] })
    };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      const current = await store.get(key, { type: "json" }) || { items: [] };

      current.items.push({
        text: body.text,
        user: body.user || "anon",
        time: Date.now()
      });

      await store.setJSON(key, current);

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true })
      };
    } catch (e) {
      return { statusCode: 400, body: "Błąd parsowania" };
    }
  }

  return { statusCode: 405, body: "Method not allowed" };
}
