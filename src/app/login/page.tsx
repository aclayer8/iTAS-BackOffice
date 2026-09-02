"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email or password is incorrect");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter', -apple-system, sans-serif",
      backgroundColor: "#f8fafc",
    }}>
      {/* Left Panel */}
      <div style={{
        width: "420px",
        flexShrink: 0,
        background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 40px",
        color: "white",
      }}>
        <div>
          {/* Logo */}
          <div style={{ marginBottom: "48px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 12px",
              borderRadius: "10px",
              background: "white",
              overflow: "hidden",
            }}>
              <Image
                src="/itas-logo.png"
                alt="iTAS Solutions"
                width={174}
                height={102}
                priority
                style={{ display: "block", width: "148px", height: "auto" }}
              />
            </div>
          </div>

          {/* Headline */}
          <div>
            <div style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.3, marginBottom: "16px" }}>
              IT Asset &amp;<br />Contract Management
            </div>
            <div style={{ fontSize: "14px", opacity: 0.65, lineHeight: 1.7 }}>
              ระบบจัดการสัญญา อุปกรณ์ และ License สำหรับทีม i-TAS
            </div>
          </div>

          {/* Features */}
          <div style={{ marginTop: "48px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { icon: "📄", text: "จัดการสัญญาและ Renewal" },
              { icon: "🖥️", text: "ติดตาม Assets และ Warranty" },
              { icon: "🏢", text: "ข้อมูลลูกค้าครบวงจร" },
            ].map((item) => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "15px", flexShrink: 0,
                }}>{item.icon}</div>
                <span style={{ fontSize: "13px", opacity: 0.8 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: "11px", opacity: 0.4 }}>
          © 2026 i-TAS Co., Ltd. · Internal Use Only
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 32px",
      }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>

          <div style={{ marginBottom: "36px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
              Sign in to BackOffice
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              เข้าสู่ระบบด้วย Email และ Password ของคุณ
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Error */}
            {error && (
              <div style={{
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@itas.co.th"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                  backgroundColor: "white",
                }}
                onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                  backgroundColor: "white",
                }}
                onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px",
                background: loading ? "#93c5fd" : "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
                letterSpacing: "0.01em",
              }}
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "Sign In →"}
            </button>
          </form>

          {/* Info */}
          <div style={{
            marginTop: "32px",
            padding: "14px 16px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#64748b",
            lineHeight: 1.6,
          }}>
            🔒 ระบบนี้สำหรับเจ้าหน้าที่ i-TAS เท่านั้น<br />
            หากไม่มี Account กรุณาติดต่อ Administrator
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
