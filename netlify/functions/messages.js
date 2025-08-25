export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Use GET" };
  }
  const room = (event.queryStringParameters?.room || "global").replace(/[^a-z0-9_-]/gi,"");
  // UWAGA: poprawna interpolacja klucza – w backtickach:
  const headKey = room/${room}-head.json;
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true, headKey })
  };
}
