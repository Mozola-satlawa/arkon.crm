import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 50;

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" }
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const clientId = form.get("clientId") || "anon";
    const folder = form.get("folder") || "misc";

    if (!file) {
      return new Response(JSON.stringify({ error: "Brak pliku" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    // generujemy ścieżkę
    const ts = Date.now();
    const safe = (s) => String(s).replace(/[^\w.-]+/g, "_").toLowerCase();
    const parts = [];
    if (clientId) parts.push(safe(clientId));
    if (folder) parts.push(safe(folder));
    parts.push(${ts}_${safe(file.name)});   // <-- tu poprawione
    const path = parts.join("/");

    const { error } = await supa.storage.from("docs").upload(path, file.stream(), {
      contentType: file.type || "application/octet-stream",
      upsert: true
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    const pub = supa.storage.from("docs").getPublicUrl(path).data.publicUrl;

    return new Response(JSON.stringify({ ok: true, path, url: pub }), {
      status: 200, headers: { "content-type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
