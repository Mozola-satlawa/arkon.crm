import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  const store = getStore("messages");

  try {
    if (event.httpMethod === "GET") {
      const room = event.queryStringParameters?.room || "default";
      const { blobs } = await store.list({ prefix: room + "/" });
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ items: blobs }),
      };
    }

    if (event.httpMethod === "POST") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: "Brak body" }),
        };
      }
      const payload = JSON.parse(event.body);
      const room = payload.room || "default";
      const id = ${room}/${Date.now()}.json;
      await store.setJSON(id, {
        ...payload,
        id,
        at: Date.now(),
      });
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ ok: true, id }),
      };
    }

    return { statusCode: 405, headers: CORS, body: "Method not allowed" };
  } catch (e) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: e.message }),
    };
  }
}
