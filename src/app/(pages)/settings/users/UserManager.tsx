"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Plus, ShieldCheck, UserRound } from "lucide-react";
import styles from "./users.module.css";

type UserRow = { id:string; name:string; email:string; role:string; status:string; mustChangePassword:boolean; lastLoginAt:string|null };
const roles = ["VIEWER", "ENGINEER", "SALE", "ADMIN"];

export default function UserManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/users", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Unable to create user");
    setUsers((current) => [...current, { ...result.data, lastLoginAt:null }].sort((a,b) => a.name.localeCompare(b.name)));
    setShowAdd(false); setMessage("User created. They must change the temporary password at first sign-in.");
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!resetUser) return; setMessage("");
    const temporaryPassword = String(new FormData(event.currentTarget).get("temporaryPassword") ?? "");
    const response = await fetch(`/api/users/${resetUser.id}/reset-password`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ temporaryPassword }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Unable to reset password");
    setUsers((current) => current.map((user) => user.id === resetUser.id ? { ...user, mustChangePassword:true } : user));
    setResetUser(null); setMessage("Password reset. The user must change it at next sign-in.");
  }

  return <div className={styles.page}>
    <header><div><span><ShieldCheck size={15}/> Administration</span><h1>User Management</h1><p>Create local accounts and reset temporary passwords.</p></div><button onClick={() => setShowAdd(true)}><Plus size={17}/> Add user</button></header>
    {message && <div className={styles.message} role="status">{message}</div>}
    <section className={styles.table}><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Password</th><th>Last sign-in</th><th></th></tr></thead><tbody>
      {users.map((user) => <tr key={user.id}><td><div className={styles.identity}><span><UserRound size={18}/></span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td>{user.role}</td><td><span className={styles.active}>{user.status}</span></td><td>{user.mustChangePassword ? "Change required" : "Set"}</td><td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB", { timeZone:"Asia/Bangkok" }) : "Never"}</td><td><button className={styles.reset} onClick={() => setResetUser(user)}><KeyRound size={15}/> Reset</button></td></tr>)}
    </tbody></table></section>
    {(showAdd || resetUser) && <div className={styles.overlay} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h2 id="dialog-title">{showAdd ? "Add local user" : `Reset password`}</h2><p>{showAdd ? "New accounts use the company email domain and must change their password at first sign-in." : `Set a temporary password for ${resetUser?.name}.`}</p>
      <form onSubmit={showAdd ? createUser : resetPassword}>
        {showAdd && <><label>Full name<input name="name" required/></label><label>Company email<input name="email" type="email" placeholder="name@i-tas.co.th" required/></label><label>Role<select name="role">{roles.map((role) => <option key={role}>{role}</option>)}</select></label></>}
        <label>Temporary password<input name="temporaryPassword" type="password" autoComplete="new-password" required/></label>
        <small>Minimum 10 characters with uppercase, lowercase, number, and special character. The user must replace it at sign-in.</small>
        <div><button type="button" className={styles.cancel} onClick={() => { setShowAdd(false); setResetUser(null); }}>Cancel</button><button type="submit">{showAdd ? "Create user" : "Reset password"}</button></div>
      </form>
    </section></div>}
  </div>;
}
