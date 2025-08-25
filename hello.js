export default async (req, context) => {
  return new Response("Hello from Netlify Function!", {
    headers: { "Content-Type": "text/plain" },
  });
};