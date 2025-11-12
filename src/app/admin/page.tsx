"use client";

import { useEffect, useState } from "react";

type Allowed = { _id: string; email: string; defaultRole: "admin" | "user"; note?: string };

export default function AdminPage() {
  const [list, setList] = useState<Allowed[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  async function load() {
    const res = await fetch("/api/admin/allowed-emails");
    if (res.ok) setList(await res.json());
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/allowed-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, defaultRole: role }),
    });
    setEmail("");
    await load();
  }

  async function del(email: string) {
    await fetch(`/api/admin/allowed-emails?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto" }}>
      <h1>Admin</h1>
      <section>
        <h2>Liste blanche</h2>
        <form onSubmit={add} style={{ display: "flex", gap: 8 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email@domaine.com" required />
          <select value={role} onChange={e => setRole(e.target.value as any)}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit">Ajouter/Mettre à jour</button>
        </form>
        <ul>
          {list.map(item => (
            <li key={item._id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ minWidth: 260 }}>{item.email}</code>
              <span>{item.defaultRole}</span>
              <button onClick={() => del(item.email)}>Supprimer</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}