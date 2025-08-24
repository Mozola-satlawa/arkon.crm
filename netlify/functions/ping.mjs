import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 50;

export default async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "pong",
      time: new Date().toISOString()
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
};
