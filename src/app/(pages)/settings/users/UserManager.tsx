"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import styles from "./users.module.css";

type UserRow = { id:string; name:string; email:string; role:string; status:string; mustChangePassword:boolean; lastLoginAt:string|null };
const roles = ["VIEWER", "ENGINEER", "SALE", "ADMIN"];

export default function UserManager({ currentUserId, initialUsers }: { currentUserId: string; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

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

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editUser) return; setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/users/${editUser.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Unable to update user");
    setUsers((current) => current.map((user) => user.id === editUser.id ? { ...user, ...result.data, lastLoginAt: result.data.lastLoginAt ?? null } : user).sort((a,b) => a.name.localeCompare(b.name)));
    setEditUser(null); setMessage("User updated.");
  }

  async function removeUser() {
    if (!deleteUser) return; setMessage("");
    const response = await fetch(`/api/users/${deleteUser.id}`, { method:"DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Unable to delete user");
    setUsers((current) => current.filter((user) => user.id !== deleteUser.id));
    setDeleteUser(null); setMessage("User deleted. Their access has been revoked.");
  }

  return <div className={styles.page}>
    <header><div><span><ShieldCheck size={15}/> Administration</span><h1>User Management</h1><p>Create, edit, delete, and reset local accounts. Admin access only.</p></div><button onClick={() => setShowAdd(true)}><Plus size={17}/> Add user</button></header>
    {message && <div className={styles.message} role="status">{message}</div>}
    <section className={styles.table}><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Password</th><th>Last sign-in</th><th></th></tr></thead><tbody>
      {users.map((user) => <tr key={user.id}><td><div className={styles.identity}><span><UserRound size={18}/></span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td>{user.role}</td><td><span className={user.status === "ACTIVE" ? styles.active : styles.inactive}>{user.status}</span></td><td>{user.mustChangePassword ? "Change required" : "Set"}</td><td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB", { timeZone:"Asia/Bangkok" }) : "Never"}</td><td><div className={styles.actions}><button className={styles.secondary} onClick={() => setEditUser(user)}><Pencil size={15}/> Edit</button><button className={styles.secondary} onClick={() => setResetUser(user)}><KeyRound size={15}/> Reset</button><button className={styles.danger} disabled={user.id === currentUserId} title={user.id === currentUserId ? "You cannot delete your own account" : undefined} onClick={() => setDeleteUser(user)}><Trash2 size={15}/> Delete</button></div></td></tr>)}
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
    {editUser && <div className={styles.overlay} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
      <h2 id="edit-dialog-title">Edit user</h2><p>Update account details, role, or status.</p>
      <form onSubmit={updateUser}>
        <label>Full name<input name="name" defaultValue={editUser.name} required/></label>
        <label>Company email<input name="email" type="email" defaultValue={editUser.email} required/></label>
        <label>Role<select name="role" defaultValue={editUser.role} disabled={editUser.id === currentUserId}>{roles.map((role) => <option key={role}>{role}</option>)}</select>{editUser.id === currentUserId && <input type="hidden" name="role" value={editUser.role}/>}</label>
        <label>Status<select name="status" defaultValue={editUser.status} disabled={editUser.id === currentUserId}><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></select>{editUser.id === currentUserId && <input type="hidden" name="status" value={editUser.status}/>}</label>
        <div><button type="button" className={styles.cancel} onClick={() => setEditUser(null)}>Cancel</button><button type="submit">Save changes</button></div>
      </form>
    </section></div>}
    {deleteUser && <div className={styles.overlay} role="presentation"><section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <h2 id="delete-dialog-title">Delete user?</h2><p>This revokes access immediately and keeps the audit history. Delete <strong>{deleteUser.name}</strong>?</p>
      <div className={styles.dialogActions}><button type="button" className={styles.cancel} onClick={() => setDeleteUser(null)}>Cancel</button><button type="button" className={styles.confirmDelete} onClick={removeUser}>Delete user</button></div>
    </section></div>}
  </div>;
}
