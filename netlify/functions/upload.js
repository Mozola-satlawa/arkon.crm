export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Use POST" };
  }
  try {
    const ctype = event.headers["content-type"] || "application/octet-stream";
    const ext = (ctype.split("/")[1] || "bin").toLowerCase().split(";")[0];
    const key = uploads/${Date.now()}-${crypto.randomUUID()}.${ext}; // <- poprawny backtick i średnik

    // Tu normalnie zapis do blob storage / S3 / Neon, ale na razie testowo:
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, key })
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
