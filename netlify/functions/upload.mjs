export default async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(JSON.stringify({ ok: false, error: "No file uploaded" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    // Nazwa bezpieczna
    const safe = (name) =>
      String(name).replace(/[^a-z0-9.-]/gi, "").toLowerCase();

    const ts = Date.now();
    const filename = ${ts}_${safe(file.name)};

    // W tym przykładzie zapis tylko „na sucho” (do testu)
    return new Response(
      JSON.stringify({
        ok: true,
        file: filename,
        size: file.size
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
