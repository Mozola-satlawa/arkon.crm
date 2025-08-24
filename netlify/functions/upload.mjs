
// netlify/functions/upload.mjs
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 50;

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const safe = (s) => String(s).normalize("NFKD").replace(/[^\w.-]+/g, "_").toLowerCase();

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" }
      });
    }

    // multipart/form-data
    const form = await req.formData();
    const file = form.get("file");
    const clientId = form.get("clientId") || "anon";
    const folder = form.get("folder") || "misc";

    if (!file) {
      return new Response(JSON.stringify({ error: "Brak pliku" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    // Ścieżka w buckecie "docs"
    const ts = Date.now();
    const parts = [];
    if (clientId) parts.push(safe(clientId));
    if (folder) parts.push(safe(folder));
    parts.push(${ts}_${safe(file.name)});   // <-- poprawione (backticki!)
    const path = parts.join("/");

    // Upload do Supabase Storage
    const { error } = await supa.storage.from("docs").upload(
      path,
      file.stream(),
      {
        contentType: file.type || "application/octet-stream",
        upsert: true
      }
    );

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const { data } = supa.storage.from("docs").getPublicUrl(path);
    const url = data?.publicUrl || "";

    return new Response(JSON.stringify({ ok: true, path, url }), {
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
