import { EventEmitter } from "events";

// zwiększamy globalny limit listenerów
EventEmitter.defaultMaxListeners = 50;

export default async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Netlify Functions działają!",
      time: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
};
