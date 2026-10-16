"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, FileText, LoaderCircle, LockKeyhole, Mail, MonitorCog, ShieldCheck } from "lucide-react";
import styles from "./login.module.css";

const features = [
  { icon: FileText, text: "Contract and renewal management" },
  { icon: MonitorCog, text: "Asset and warranty tracking" },
  { icon: Building2, text: "Centralized customer information" },
];

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (response?.error) {
      setError("Email or password is incorrect");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="iTAS Back Office overview">
        <div>
          <div className={styles.logoFrame}>
            <Image src="/itas-logo.png" alt="iTAS Solutions" width={174} height={102} priority className={styles.logo} />
          </div>

          <div className={styles.brandCopy}>
            <span className={styles.eyebrow}>iTAS Back Office</span>
            <h2>One workspace for your service operations.</h2>
            <p>Manage contracts, assets, licenses, and customer records securely in one place.</p>
          </div>

          <ul className={styles.featureList}>
            {features.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className={styles.featureIcon} aria-hidden="true"><Icon size={18} /></span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.copyright}>© 2026 i-TAS Co., Ltd. · Internal use only</p>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.mobileLogo}>
            <Image src="/itas-logo.png" alt="iTAS Solutions" width={136} height={80} priority />
          </div>

          <div className={styles.heading}>
            <span className={styles.secureBadge}><ShieldCheck size={15} /> Secure access</span>
            <h1>Sign in to iTAS Back Office</h1>
            <p>Enter your company email and password to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.field}>
              <label htmlFor="email">Email address</label>
              <div className={styles.inputWrap}>
                <Mail size={18} aria-hidden="true" />
                <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@itas.co.th" autoComplete="email" required />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <LockKeyhole size={18} aria-hidden="true" />
                <input id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <><LoaderCircle className={styles.spinner} size={18} /> Signing in...</> : <>Sign in <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className={styles.notice}>
            <ShieldCheck size={18} aria-hidden="true" />
            <p><strong>Authorized personnel only.</strong><br />Contact your administrator if you need access.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
