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

    const { path } = await req.json();
    if (!path) {
      return new Response(JSON.stringify({ error: "Brak parametru path" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    const { error } = await supa.storage.from("docs").remove([path]);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, deleted: path }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
};
