import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b = {}) => json(200, b);
const bad = (m="Bad Request") => json(400, { error:m });
const notFound = () => json(404, { error:"Not found" });

const store = getStore("docs");

export async function handler(event){
  if(event.httpMethod==="OPTIONS"){ return { statusCode:204, headers:CORS }; }

  try{
    if(event.httpMethod==="GET" && (event.path.endsWith("/docs") || event.path.endsWith("/docs/"))){
      const { blobs, directories } = await store.list({ directories: true });
      return ok({ blobs, directories });
    }

    if(event.httpMethod==="GET"){
      const idx = event.path.indexOf("/.netlify/functions/docs/");
      const key = idx>=0 ? decodeURIComponent(event.path.slice(idx+"/.netlify/functions/docs/".length)) : null;
      if(!key) return bad("Brak klucza");
      const data = await store.get(key, { type:"arrayBuffer" });
      if(data===null) return notFound();
      return {
        statusCode: 200,
        headers: { 
          ...CORS,
          "Content-Type":"application/octet-stream",
          "Content-Disposition": `attachment; filename="${key.split("/").pop()||"file"}"`
        },
        body: Buffer.from(data).toString("base64"),
        isBase64Encoded: true
      };
    }

    if(event.httpMethod==="POST"){
      const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
      if(!ct.toLowerCase().startsWith("multipart/form-data")) return bad("Wymagane multipart/form-data");

      const raw = Buffer.from(event.body||"", event.isBase64Encoded ? "base64":"utf8");
      const req = new Request("http://local/upload", { method:"POST", headers:{ "content-type": ct }, body: raw });
      const form = await req.formData();
      const file = form.get("file");
      if(!file || typeof file.arrayBuffer!=="function") return bad("Brak pola 'file'");

      const buf = await file.arrayBuffer();
      const key = `uploads/${Date.now()}-${(file.name||"plik").replace(/\s+/g,"_")}`;
      await store.set(key, buf, { metadata: { name:file.name||"", size:file.size||0 }});
      return ok({ key });
    }

    if(event.httpMethod==="DELETE"){
      const idx = event.path.indexOf("/.netlify/functions/docs/");
      const key = idx>=0 ? decodeURIComponent(event.path.slice(idx+"/.netlify/functions/docs/".length)) : null;
      if(!key) return bad("Brak klucza");
      await store.delete(key);
      return ok({ key, deleted:true });
    }

    return bad("Nieobsługiwany endpoint");
  }catch(e){
    return json(500, { error: e?.message || String(e) });
  }
}
