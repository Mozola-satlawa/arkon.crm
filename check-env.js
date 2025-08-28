// check-env.js — szybki test ENV przed deployem
const required = ["NEON_DATABASE_URL"];
const optional = ["MAILGUN_API_KEY","MAILGUN_DOMAIN","TWILIO_SID","TWILIO_TOKEN","TWILIO_FROM","AUTENTI_API_KEY","AUTENTI_BASE_URL","AUTENTI_CALLBACK_SECRET"];
let ok = true;
for(const k of required){
  if(!process.env[k]){ console.error("MISSING:", k); ok = false; }
}
if(ok){
  console.log("✅ ENV OK (required). Optional present:", optional.filter(k=>process.env[k]).join(", ") || "(none)");
  process.exit(0);
}else{
  console.error("❌ Uzupełnij brakujące ENV i spróbuj ponownie.");
  process.exit(1);
}
