// db.js
// Warstwa API łącząca klientów i umowy
import { supabase } from "./app.js";

const API_URL = "/.netlify/functions/contracts"; // endpoint Netlify

// ====== KLIENCI (Supabase) ======
export async function listClients() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addClient(client) {
  const { data, error } = await supabase.from("clients").insert([client]).select().single();
  if (error) throw error;
  return data;
}

// ====== UMOWY (Netlify Blobs) ======
export async function listContracts() {
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error("Nie mogę pobrać umów");
  return (await r.json()).items;
}

export async function getContract(id) {
  const r = await fetch(`${API_URL}/${id}`);
  if (!r.ok) throw new Error("Nie mogę pobrać umowy");
  return await r.json();
}

export async function addContract(contract) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contract),
  });
  if (!r.ok) throw new Error("Nie mogę dodać umowy");
  return await r.json();
}

// ====== POWIĄZANIA ======
// Tworzy klienta z od razu przypisaną umową
export async function addClientWithContract(client, contract) {
  // 1. Dodaj klienta
  const c = await addClient(client);

  // 2. Dodaj umowę i przypisz ID klienta
  const contractData = {
    ...contract,
    parties: [{ role: "client", id: c.id, name: c.name }],
  };
  const u = await addContract(contractData);

  return { client: c, contract: u };
}
