import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 50;

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// buduje bezpieczną ścieżkę w bucket
function safe(name = "plik") {
  return String(name)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 180)
    .toLowerCase();
}

function buildPath({ clientId, folder, name }) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const parts = [];
  if (clientId) parts.push(safe(clientId));
  if (folder) parts.push(safe(folder));
  parts.push(${ts}_${safe(name)});
  return parts.join("/");
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" }
      });
    }

    let file, clientId = "", folder = "";

    // 1) Spróbuj multipart/form-data
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      file = form.get("file");               // File
      clientId = form.get("clientId") || "";
      folder = form.get("folder") || "";
      if (!file || typeof file.arrayBuffer !== "function") {
        return new Response(JSON.stringify({ error: "Brak pola 'file' w multipart/form-data" }), {
          status: 400, headers: { "content-type": "application/json" }
        });
      }
    } else {
      // 2) JSON fallback: { fileName, base64, clientId, folder }
      const data = await req.json().catch(() => ({}));
      const { fileName, base64 } = data;
      clientId = data.clientId || "";
      folder = data.folder || "";
      if (!fileName || !base64) {
        return new Response(JSON.stringify({ error: "Oczekuję multipart/form-data z 'file' albo JSON { fileName, base64 }" }), {
          status: 400, headers: { "content-type": "application/json" }
        });
      }
      const bin = Buffer.from(base64, "base64");
      file = new Blob([bin], { type: "application/octet-stream" });
      file.name = fileName;
    }

    const path = buildPath({ clientId, folder, name: file.name || "plik" });

    // Upload do bucketu 'docs'
    const { data, error } = await supa.storage
      .from("docs")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false, // zmień na true jeśli chcesz nadpisywać
        contentType: file.type || "application/octet-stream"
      });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    // Publiczny URL
    const pub = supa.storage.from("docs").getPublicUrl(path).data.publicUrl;

    return new Response(JSON.stringify({
      ok: true,
      bucket: "docs",
      path,
      publicUrl: pub
    }), { status: 200, headers: { "content-type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
