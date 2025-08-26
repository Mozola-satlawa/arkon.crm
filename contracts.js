import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body)
});
const ok = (b={}) => json(200,b);
const bad = (m="Bad Request") => json(400,{error:m});
const notFound = () => json(404,{error:"Not found"});

const store = getStore("contracts");
const rid = (p="") => `${p}${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

function getId(path){
  const base = "/.netlify/functions/contracts/";
  const i = path.indexOf(base);
  if(i===-1) return null;
  const tail = path.slice(i+base.length);
  return decodeURIComponent(tail);
}

export async function handler(event){
  if(event.httpMethod==="OPTIONS"){ return { statusCode:204, headers:CORS }; }

  try{
    if(event.httpMethod==="GET" && (event.path.endsWith("/contracts") || event.path.endsWith("/contracts/"))){
      const { blobs } = await store.list();
      return ok({ items: blobs });
    }

    if(event.httpMethod==="GET"){
      const id = getId(event.path);
      if(!id) return bad("Brak ID");
      const data = await store.get(id, { type:"json" });
      if(data===null) return notFound();
      return ok({ id, ...data });
    }

    if(event.httpMethod==="POST"){
      if(!event.body) return bad("Brak body");
      let p={}; try{ p=JSON.parse(event.body) }catch{ return bad("Zły JSON"); }
      const id = rid("c_");
      const now = Date.now();
      await store.setJSON(id, { id, title:p.title||"Bez tytułu", content:p.content||"", parties:Array.isArray(p.parties)?p.parties:[], status:p.status||"draft", created_at:now, updated_at:now });
      return json(201, { id, created:true });
    }

    if(event.httpMethod==="PUT" || event.httpMethod==="PATCH"){
      const id = getId(event.path);
      if(!id) return bad("Brak ID");
      const prev = await store.get(id, { type:"json" });
      if(prev===null) return notFound();
      let patch={}; if(event.body){ try{ patch=JSON.parse(event.body) }catch{ return bad("Zły JSON"); } }
      const next = { ...prev, ...patch, id, updated_at: Date.now() };
      await store.setJSON(id, next);
      return ok({ id, updated:true });
    }

    if(event.httpMethod==="DELETE"){
      const id = getId(event.path);
      if(!id) return bad("Brak ID");
      await store.delete(id);
      return ok({ id, deleted:true });
    }

    return bad("Nieobsługiwany endpoint");
  }catch(e){
    return json(500, { error: e?.message || String(e) });
  }
}
