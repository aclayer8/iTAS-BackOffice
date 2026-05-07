"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import Link from "next/link";

// --- Types ---
interface SheetResult {
  sheetName: string;
  contractNo: string;
  status: "imported" | "skipped" | "error";
  customerName?: string;
  assetsCreated: number;
  itemsCreated: number;
  notificationsCreated: number;
  message: string;
  parseErrors?: string[];
}
interface ImportResponse {
  success: boolean;
  summary?: { total: number; imported: number; skipped: number; errors: number };
  results?: SheetResult[];
  error?: string;
}
interface ResetResponse {
  success: boolean;
  deleted?: { notifications: number; contractItems: number; assets: number; contracts: number; customers: number };
  message?: string;
  error?: string;
}

const STATUS_COLOR = { imported: "#059669", skipped: "#d97706", error: "#dc2626" };
const STATUS_BG    = { imported: "#d1fae5", skipped: "#fef3c7", error: "#fee2e2" };
const STATUS_LABEL = { imported: "✅ นำเข้าแล้ว", skipped: "⏭ ข้ามแล้ว", error: "❌ Error" };

// --- Animated progress bar ---
function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed]   = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!loading) { setProgress(0); setElapsed(0); return; }
    startRef.current = Date.now();
    setProgress(0);

    const ei = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 500);
    const pi = setInterval(() => setProgress((p) => {
      if (p >= 88) return p;
      return p + Math.max((90 - p) * 0.04, 0.3);
    }), 400);
    return () => { clearInterval(ei); clearInterval(pi); };
  }, [loading]);

  if (!loading) return null;
  const pct = Math.round(progress);
  const steps = [
    { label: "อ่านไฟล์ Excel",    done: pct > 5  },
    { label: "แยก Sheets",         done: pct > 15 },
    { label: "บันทึก Customer",    done: pct > 35 },
    { label: "บันทึก Contract",    done: pct > 55 },
    { label: "บันทึก Assets",      done: pct > 70 },
    { label: "ตั้ง Notifications", done: pct > 85 },
  ];

  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px 28px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "17px" }}>⏳ กำลังนำเข้าข้อมูล...</div>
        <div style={{ fontSize: "15px", color: "#6b7280" }}>ผ่านไปแล้ว {elapsed} วินาที</div>
      </div>
      <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "99px", overflow: "hidden", marginBottom: "16px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #1E3A5F, #2563eb)", borderRadius: "99px", transition: "width .4s ease" }} />
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {steps.map((s) => (
          <div key={s.label} style={{ fontSize: "13px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", backgroundColor: s.done ? "#d1fae5" : "#f1f5f9", color: s.done ? "#065f46" : "#94a3b8", transition: "all .3s" }}>
            {s.done ? "✓ " : ""}{s.label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "14px" }}>
        กรุณารอจนกว่าระบบจะประมวลผลเสร็จ — อาจใช้เวลา 15-45 วินาที ขึ้นอยู่กับจำนวน Sheets
      </div>
    </div>
  );
}

// --- Reset confirmation dialog ---
function ResetDialog({ onConfirm, onCancel, resetting }: { onConfirm: () => void; onCancel: () => void; resetting: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize: "48px", textAlign: "center", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ textAlign: "center", color: "#dc2626", margin: "0 0 8px", fontSize: "22px" }}>ล้างข้อมูลทั้งหมด?</h2>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: "16px", marginBottom: "24px", lineHeight: "1.6" }}>
          ระบบจะลบ <strong>Customers, Contracts, Assets, Notifications</strong> ทั้งหมดออกจากฐานข้อมูล<br />
          <span style={{ color: "#dc2626" }}>ไม่สามารถกู้คืนได้</span> — Users ยังคงอยู่
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onCancel}
            disabled={resetting}
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#374151", cursor: "pointer", fontSize: "16px", fontWeight: 600 }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={resetting}
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#dc2626", color: "white", cursor: resetting ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: 700, opacity: resetting ? 0.7 : 1 }}
          >
            {resetting ? "⏳ กำลังล้าง..." : "🗑️ ล้างเลย"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---
export default function ImportPage() {
  const [file,      setFile]      = useState<File | null>(null);
  const [dragging,  setDragging]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<ImportResponse | null>(null);
  const [force,     setForce]     = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".xlsx")) setFile(dropped);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setResetResult(null);
    const fd = new FormData();
    fd.append("file", file);
    if (force) fd.append("force", "true");
    try {
      const res  = await fetch("/api/import/certification", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res  = await fetch("/api/admin/reset-data", { method: "POST" });
      const data = await res.json();
      setResetResult(data);
      setResult(null);
    } catch (err) {
      setResetResult({ success: false, error: String(err) });
    } finally {
      setResetting(false);
      setShowReset(false);
    }
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {showReset && <ResetDialog onConfirm={handleReset} onCancel={() => setShowReset(false)} resetting={resetting} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "16px" }}>← Dashboard</Link>
          <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "26px" }}>📥 Import Certification Form</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>
            อัปโหลดไฟล์ Excel Certification of Maintenance Service — ระบบจะดึงข้อมูล Customer, Contract, Asset และตั้ง Notification อัตโนมัติ
          </p>
        </div>
        <button
          onClick={() => setShowReset(true)}
          disabled={loading || resetting}
          style={{
            backgroundColor: "white", color: "#dc2626", border: "1px solid #fca5a5",
            padding: "10px 18px", borderRadius: "8px", cursor: "pointer",
            fontSize: "15px", fontWeight: 600, whiteSpace: "nowrap",
            boxShadow: "0 1px 3px rgba(0,0,0,.06)",
          }}
        >
          🗑️ ล้างข้อมูลทั้งหมด
        </button>
      </div>

      {/* Reset result banner */}
      {resetResult && (
        <div style={{
          backgroundColor: resetResult.success ? "#d1fae5" : "#fee2e2",
          border: `1px solid ${resetResult.success ? "#6ee7b7" : "#fca5a5"}`,
          borderRadius: "10px", padding: "14px 18px", marginBottom: "20px",
          display: "flex", gap: "12px", alignItems: "center",
        }}>
          <span style={{ fontSize: "22px" }}>{resetResult.success ? "✅" : "❌"}</span>
          <div>
            <div style={{ fontWeight: 700, color: resetResult.success ? "#065f46" : "#dc2626", fontSize: "16px" }}>
              {resetResult.success ? "ล้างข้อมูลสำเร็จ!" : "เกิดข้อผิดพลาด"}
            </div>
            {resetResult.success && resetResult.deleted && (
              <div style={{ color: "#047857", fontSize: "14px", marginTop: "2px" }}>
                ลบ: {resetResult.deleted.customers} customers, {resetResult.deleted.contracts} contracts, {resetResult.deleted.assets} assets, {resetResult.deleted.contractItems} items, {resetResult.deleted.notifications} notifications
              </div>
            )}
            {!resetResult.success && (
              <div style={{ color: "#7f1d1d", fontSize: "14px", marginTop: "2px" }}>{resetResult.error}</div>
            )}
          </div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { icon: "🏢", title: "Customer",   desc: "สร้าง/อัปเดตข้อมูลลูกค้า" },
          { icon: "📄", title: "Contract",   desc: "สร้างสัญญาพร้อม Items" },
          { icon: "🖥️", title: "Assets",     desc: "สร้าง Asset record (มี S/N)" },
          { icon: "🔔", title: "แจ้งเตือน", desc: "แจ้งเมื่อสัญญาใกล้หมด 90 วัน" },
        ].map((b) => (
          <div key={b.title} style={{ backgroundColor: "white", borderRadius: "10px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,.08)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "26px" }}>{b.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "15px" }}>{b.title}</div>
              <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "2px" }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#1E3A5F" : "#cbd5e1"}`,
          borderRadius: "16px", padding: "48px 32px", textAlign: "center",
          backgroundColor: dragging ? "#eff6ff" : "white",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all .2s", marginBottom: "20px",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)", opacity: loading ? 0.6 : 1,
        }}
      >
        <input ref={inputRef} type="file" accept=".xlsx" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
        {file ? (
          <>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#059669" }}>✅ {file.name}</div>
            <div style={{ color: "#6b7280", fontSize: "15px", marginTop: "4px" }}>
              {(file.size / 1024).toFixed(1)} KB — {loading ? "กำลังประมวลผล..." : "คลิกเพื่อเปลี่ยนไฟล์"}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#374151" }}>วาง Excel (.xlsx) ที่นี่ หรือคลิกเพื่อเลือกไฟล์</div>
            <div style={{ color: "#9ca3af", fontSize: "15px", marginTop: "6px" }}>รองรับไฟล์ Certification of Maintenance Service — นำเข้าได้ทีเดียวทุก Sheet</div>
          </>
        )}
      </div>

      {/* Options */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={loading}
            style={{ width: "16px", height: "16px", accentColor: "#dc2626", cursor: "pointer" }} />
          <span style={{ fontSize: "15px", color: "#dc2626", fontWeight: 600 }}>
            🔄 Force re-import (นำเข้าซ้ำแม้ Contract จะมีอยู่แล้ว)
          </span>
        </label>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "28px" }}>
        <button onClick={handleImport} disabled={!file || loading} style={{
          backgroundColor: file && !loading ? "#1E3A5F" : "#9ca3af",
          color: "white", border: "none", padding: "14px 36px", borderRadius: "10px",
          cursor: file && !loading ? "pointer" : "not-allowed",
          fontSize: "17px", fontWeight: "bold", transition: "background .2s",
        }}>
          {loading ? "⏳ กำลังนำเข้า..." : "🚀 เริ่มนำเข้าข้อมูล"}
        </button>
        {file && !loading && (
          <button onClick={() => { setFile(null); setResult(null); setForce(false); }} style={{
            backgroundColor: "white", color: "#6b7280", border: "1px solid #e2e8f0",
            padding: "14px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "16px",
          }}>ล้าง</button>
        )}
      </div>

      <ProgressBar loading={loading} />

      {/* Import error */}
      {result && !result.success && (
        <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
          <div style={{ color: "#dc2626", fontWeight: 700 }}>❌ เกิดข้อผิดพลาด</div>
          <div style={{ color: "#7f1d1d", fontSize: "15px", marginTop: "4px" }}>{result.error}</div>
        </div>
      )}

      {/* Summary */}
      {result?.success && result.summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "ทั้งหมด",    value: result.summary.total,    color: "#1E3A5F", bg: "#eff6ff" },
            { label: "นำเข้าแล้ว", value: result.summary.imported, color: "#059669", bg: "#d1fae5" },
            { label: "ข้ามแล้ว",   value: result.summary.skipped,  color: "#d97706", bg: "#fef3c7" },
            { label: "Error",      value: result.summary.errors,   color: "#dc2626", bg: "#fee2e2" },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: s.bg, borderRadius: "10px", padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "30px", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "15px", color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {result?.success && result.results && (
        <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
            <thead>
              <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
                {["Sheet / Contract No.", "ลูกค้า", "Items", "Assets ใหม่", "Notifications", "สถานะ", "รายละเอียด"].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontWeight: 700, color: "#2563EB", fontFamily: "monospace", fontSize: "14px" }}>{r.contractNo || "—"}</div>
                    <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "2px" }}>{r.sheetName}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{r.customerName ?? "—"}</td>
                  <td style={{ padding: "11px 14px", textAlign: "center" }}>
                    <span style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, fontSize: "14px" }}>{r.itemsCreated}</span>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "center" }}>
                    <span style={{ backgroundColor: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, fontSize: "14px" }}>{r.assetsCreated}</span>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "center", color: "#6b7280" }}>
                    {r.notificationsCreated > 0 ? `🔔 ${r.notificationsCreated}` : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ backgroundColor: STATUS_BG[r.status], color: STATUS_COLOR[r.status], padding: "3px 10px", borderRadius: "99px", fontSize: "14px", fontWeight: 700 }}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "#6b7280", fontSize: "14px", maxWidth: "280px" }}>
                    <div title={r.message}>{r.message.length > 80 ? r.message.slice(0, 80) + "..." : r.message}</div>
                    {r.parseErrors && r.parseErrors.length > 0 && (
                      <div style={{ marginTop: "4px", color: "#dc2626", fontSize: "13px" }}>⚠️ Parse: {r.parseErrors.join("; ")}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result?.success && result.summary && result.summary.imported > 0 && (
        <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
          <Link href="/assets" style={{ backgroundColor: "#7c3aed", color: "white", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "16px", fontWeight: 600 }}>
            🖥️ ดู Assets ที่นำเข้า
          </Link>
          <Link href="/contracts" style={{ backgroundColor: "#1E3A5F", color: "white", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "16px", fontWeight: 600 }}>
            📄 ดู Contracts ที่นำเข้า
          </Link>
        </div>
      )}
    </div>
  );
}
