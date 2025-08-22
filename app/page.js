"use client";
import { useState } from "react";

const S = {
  nav: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #263168", position: "sticky", top: 0, background: "#0b1020" },
  brand: { fontWeight: 700, letterSpacing: .5 },
  tab: (a) => ({ padding: "6px 10px", borderRadius: 8, background: a ? "#1a244d" : "transparent", cursor: "pointer" }),
  wrap: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  card: { background: "#0f1636", border: "1px solid #263168", borderRadius: 12, padding: 16, marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", borderBottom: "1px solid #263168", padding: "8px 6px", fontSize: 13, color: "#a3b3ff" },
  td: { borderBottom: "1px solid #1a244d", padding: "8px 6px", fontSize: 14 },
  input: { background: "#0e1330", border: "1px solid #263168", color: "#e7ecff", borderRadius: 8, padding: "10px 12px", outline: "none", width: "100%" },
  btn: { background: "#3a6df0", border: "none", color: "#fff", padding: "10px 14px", borderRadius: 8, cursor: "pointer" },
  chip: { display: "inline-block", padding: "4px 8px", borderRadius: 999, background: "#1a244d", fontSize: 12 },
  h1: { margin: "0 0 8px", fontSize: 22 },
};

const SEED_CLIENTS = [
  { id: "C-001", name: "Anna Kowalska", email: "anna@example.com", phone: "600-100-200", manager: "Paweł" },
  { id: "C-002", name: "Jan Nowak", email: "jan@example.com", phone: "600-100-201", manager: "Paweł" },
];

function Dashboard({ clients }) {
  return (
    <div style={S.card}>
      <h2 style={{ margin: 0 }}>Pulpit</h2>
      <div style={{ marginTop: 8, opacity: .85 }}>Liczba klientów: <strong>{clients.length}</strong></div>
    </div>
  );
}

function Clients() {
  const [rows, setRows] = useState(SEED_CLIENTS);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", manager: "" });

  const filtered = rows.filter(r =>
    (r.name + r.email + r.phone + r.manager).toLowerCase().includes(q.toLowerCase())
  );

  const add = () => {
    if (!form.name.trim()) return;
    const next = {
      id: C-${(rows.length + 1).toString().padStart(3, "0")},
      ...form,
    };
    setRows([next, ...rows]);
    setForm({ name: "", email: "", phone: "", manager: "" });
  };

  return (
    <>
      <div style={S.card}>
        <h2 style={{ marginTop: 0 }}>Klienci</h2>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          <input style={S.input} placeholder="Szukaj…" value={q} onChange={(e) => setQ(e.target.value)} />
          <input style={S.input} placeholder="Imię i nazwisko" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={S.input} placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input style={S.input} placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input style={S.input} placeholder="Opiekun" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
          <button style={S.btn} onClick={add}>Dodaj klienta</button>
        </div>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Nazwa</th>
              <th style={S.th}>E-mail</th>
              <th style={S.th}>Telefon</th>
              <th style={S.th}>Opiekun</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={S.td}>{c.id}</td>
                <td style={S.td}>{c.name}</td>
                <td style={S.td}>{c.email}</td>
                <td style={S.td}>{c.phone}</td>
                <td style={S.td}><span style={S.chip}>{c.manager || "-"}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={S.td} colSpan={5}><span style={{ opacity: .7 }}>Brak wyników…</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Page() {
  const [tab, setTab] = useState("dashboard");

  return (
    <>
      <nav style={S.nav}>
        <div style={S.brand}>ARKON CRM</div>
        {[
          ["dashboard", "Pulpit"],
          ["clients", "Klienci"],
        ].map(([key, label]) => (
          <div key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</div>
        ))}
      </nav>

      <main style={S.wrap}>
        <h1 style={S.h1}>{tab === "dashboard" ? "Pulpit" : "Klienci"}</h1>
        {tab === "dashboard" && <Dashboard clients={SEED_CLIENTS} />}
        {tab === "clients" && <Clients />}
      </main>
    </>
  );
}
