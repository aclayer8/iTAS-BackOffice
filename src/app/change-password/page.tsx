"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import styles from "./change-password.module.css";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) return setError("New passwords do not match");
    setLoading(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error ?? "Unable to change password");
    await signOut({ callbackUrl: "/login" });
  }

  return <main className={styles.page}>
    <section className={styles.card}>
      <Image src="/itas-logo.png" alt="iTAS Solutions" width={132} height={77} priority />
      <span className={styles.badge}><ShieldCheck size={15} /> Secure account</span>
      <h1>Change your password</h1>
      <p>Set a private password before continuing to iTAS Back Office.</p>
      <form onSubmit={submit}>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
        <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
        <small>At least 12 characters with uppercase, lowercase, number, and special character.</small>
        <button disabled={loading}>{loading ? <LoaderCircle className={styles.spin} size={18} /> : <KeyRound size={18} />}{loading ? "Updating..." : "Update password"}</button>
      </form>
    </section>
  </main>;
}
