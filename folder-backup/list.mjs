import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 50;

import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async (req) => {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId") || "";
    const folder = url.searchParams.get("folder") || "";

    let prefix = "";
    if (clientId) prefix += clientId.toLowerCase() + "/";
    if (folder) prefix += folder.toLowerCase() + "/";

    const { data, error } = await supa.storage.from("docs").list(prefix, {
      limit: 100,
      offset: 0
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    // dorzuć publiczne linki
    const out = (data || []).map(f => {
      const pub = supa.storage.from("docs").getPublicUrl(prefix + f.name).data.publicUrl;
      return { ...f, url: pub };
    });

    return new Response(JSON.stringify({ ok: true, files: out }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
