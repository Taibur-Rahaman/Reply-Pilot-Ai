"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

const ROLES = ["admin", "manager", "moderator", "agent"];

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("agent");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/team");
    const data = await res.json();
    if (res.ok) {
      setUsers(data.users || []);
      setNote(data.note || "");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/dashboard/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role, password }),
    });
    setEmail("");
    setName("");
    setPassword("");
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">Team &amp; RBAC</h1>
      <p className="dash__lead">
        F44 stub — roles Admin / Manager / Moderator / Agent. Fine-grained
        permission matrix polishes in Wave C.
      </p>
      {note ? <p className="dash__muted">{note}</p> : null}

      <form className="dash-panel dash-form-grid" onSubmit={onCreate}>
        <h2>Add member</h2>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn btn--primary" type="submit">
          Add
        </button>
      </form>

      <div className="dash-table-wrap dash-panel">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <code>{u.role}</code>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
