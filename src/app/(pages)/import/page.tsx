"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
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

const STATUS_COLOR = { imported: "#059669", skipped: "#d97706", error: "#dc2626" };
const STATUS_BG    = { imported: "#d1fae5", skipped: "#fef3c7", error: "#fee2e2" };
const STATUS_LABEL = { imported: "✅ นำเข้าแล้ว", skipped: "⏭ ข้ามแล้ว", error: "❌ Error" };

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed]   = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    setProgress(0);

    // Tick elapsed seconds
    const elapsedInterval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    }, 500);

    // Simulate progress: fast at start, asymptotically approaches 90%
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p;
        const step = (90 - p) * 0.04; // shrinking steps
        return p + Math.max(step, 0.3);
      });
    }, 400);

    return () => {
      clearInterval(elapsedInterval);
      clearInterval(progressInterval);
    };
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
    <div style={{
      backgroundColor: "white",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      padding: "24px 28px",
      marginBottom: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,.08)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "15px" }}>
          ⏳ กำลังนำเข้าข้อมูล...
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          ผ่านไปแล้ว {elapsed} วินาที
        </div>
      </div>

      {/* Bar */}
      <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "99px", overflow: "hidden", marginBottom: "16px" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: "linear-gradient(90deg, #1E3A5F, #2563eb)",
          borderRadius: "99px",
          transition: "width .4s ease",
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {steps.map((s) => (
          <div key={s.label} style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "99px",
            backgroundColor: s.done ? "#d1fae5" : "#f1f5f9",
            color: s.done ? "#065f46" : "#94a3b8",
            transition: "all .3s",
          }}>
            {s.done ? "✓ " : ""}{s.label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "14px" }}>
        กรุณารอจนกว่าระบบจะประมวลผลเสร็จ — อาจใช้เวลา 15–45 วินาที ขึ้นอยู่กับจำนวน Sheets
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [file,     setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ImportResponse | null>(null);
  const [force,    setForce]    = useState(false);
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

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>← Dashboard</Link>
        <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "24px" }}>📥 Import Certification Form</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
          อัปโหลดไฟล์ Excel Certification of Maintenance Service — ระบบจะดึงข้อมูล Customer, Contract, Asset และตั้ง Notification อัตโนมัติ
        </p>
      </div>

      {/* Info banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { icon: "🏢", title: "Customer",   desc: "สร้าง/อัปเดตข้อมูลลูกค้า" },
          { icon: "📄", title: "Contract",   desc: "สร้างสัญญาพร้อม Items" },
          { icon: "🖥️", title: "Assets",     desc: "สร้าง Asset record (มี S/N)" },
          { icon: "🔔", title: "แจ้งเตือน", desc: "แจ้งเมื่อสัญญาใกล้หมด 90 วัน" },
        ].map((b) => (
          <div key={b.title} style={{ backgroundColor: "white", borderRadius: "10px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,.08)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "24px" }}>{b.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "13px" }}>{b.title}</div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#1E3A5F" : "#cbd5e1"}`,
          borderRadius: "16px",
          padding: "48px 32px",
          textAlign: "center",
          backgroundColor: dragging ? "#eff6ff" : "white",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all .2s",
          marginBottom: "20px",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
        />
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
        {file ? (
          <>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#059669" }}>✅ {file.name}</div>
            <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>
              {(file.size / 1024).toFixed(1)} KB — {loading ? "กำลังประมวลผล..." : "คลิกเพื่อเปลี่ยนไฟล์"}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#374151" }}>
              วาง Excel (.xlsx) ที่นี่ หรือคลิกเพื่อเลือกไฟล์
            </div>
            <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "6px" }}>
              รองรับไฟล์ Certification of Maintenance Service — นำเข้าได้ทีเดียวทุก Sheet
            </div>
          </>
        )}
      </div>

      {/* Options row */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            disabled={loading}
            style={{ width: "16px", height: "16px", accentColor: "#dc2626", cursor: "pointer" }}
          />
          <span style={{ fontSize: "13px", color: "#dc2626", fontWeight: 600 }}>
            🔄 Force re-import (นำเข้าซ้ำแม้ Contract จะมีอยู่แล้ว)
          </span>
        </label>
      </div>

      {/* Import Button */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "28px" }}>
        <button
          onClick={handleImport}
          disabled={!file || loading}
          style={{
            backgroundColor: file && !loading ? "#1E3A5F" : "#9ca3af",
            color: "white", border: "none",
            padding: "14px 36px", borderRadius: "10px", cursor: file && !loading ? "pointer" : "not-allowed",
            fontSize: "15px", fontWeight: "bold", transition: "background .2s",
          }}
        >
          {loading ? "⏳ กำลังนำเข้า..." : "🚀 เริ่มนำเข้าข้อมูล"}
        </button>
        {file && !loading && (
          <button
            onClick={() => { setFile(null); setResult(null); setForce(false); }}
            style={{
              backgroundColor: "white", color: "#6b7280", border: "1px solid #e2e8f0",
              padding: "14px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px",
            }}
          >
            ล้าง
          </button>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar loading={loading} />

      {/* Error */}
      {result && !result.success && (
        <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
          <div style={{ color: "#dc2626", fontWeight: 700 }}>❌ เกิดข้อผิดพลาด</div>
          <div style={{ color: "#7f1d1d", fontSize: "13px", marginTop: "4px" }}>{result.error}</div>
        </div>
      )}

      {/* Summary */}
      {result?.success && result.summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "ทั้งหมด",    value: result.summary.total,    color: "#1E3A5F", bg: "#eff6ff" },
            { label: "นำเข้าแล้ว", value: result.summary.imported, color: "#059669", bg: "#d1fae5" },
            { label: "ข้ามแล้ว",   value: resul