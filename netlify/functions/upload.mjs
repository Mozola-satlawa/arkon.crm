// netlify/functions/upload.mjs
export default async (req) => {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return new Response(JSON.stringify({ ok: false, error: "No file uploaded" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    // Ustal unikalną nazwę pliku
    const ts = Date.now();
    const safe = (name) => name.replace(/[^a-z0-9_.-]/gi, "_");
    const filename = ${ts}_${safe(file.name)};

    // Tymczasowe – zapis do pamięci (tu trzeba dodać np. Cloudinary / Supabase storage)
    return new Response(JSON.stringify({ ok: true, filename }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
