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
