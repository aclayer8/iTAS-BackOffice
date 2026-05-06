"use client";

import { useState, useRef, DragEvent } from "react";
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
}
interface ImportResponse {
  success: boolean;
  summary?: { total: number; imported: number; skipped: number; errors: number };
  results?: SheetResult[];
  error?: string;
}

const STATUS_COLOR = { imported: "#059669", skipped: "#f59e0b", error: "#dc2626" };
const STATUS_BG    = { imported: "#d1fae5", skipped: "#fef3c7", error: "#fee2e2" };
const STATUS_LABEL = { imported: "✅ นำเข้าแล้ว", skipped: "⏭ ข้ามแล้ว", error: "❌ Error" };

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [file,     setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ImportResponse | null>(null);
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
          { icon: "🏢", title: "Customer", desc: "สร้าง/อัปเดตข้อมูลลูกค้า" },
          { icon: "📄", title: "Contract", desc: "สร้างสัญญาพร้อม Items" },
          { icon: "🖥️", title: "Assets", desc: "สร้าง Asset record (มี S/N)" },
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
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#1E3A5F" : "#cbd5e1"}`,
          borderRadius: "16px",
          padding: "48px 32px",
          textAlign: "center",
          backgroundColor: dragging ? "#eff6ff" : "white",
          cursor: "pointer",
          transition: "all .2s",
          marginBottom: "20px",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
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
              {(file.size / 1024).toFixed(1)} KB — คลิกเพื่อเปลี่ยนไฟล์
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#374151" }}>
              วาง Excel (.xlsx) ที่นี่ หรือคลิกเพื่อเลือกไฟล์
            </div>
            <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "6px" }}>
              รองรับไฟล์ Certification of Maintenance Service — นำเข้าได้ทีเดียวทุก sheet
            </div>
          </>
        )}
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
            onClick={() => { setFile(null); setResult(null); }}
            style={{
              backgroundColor: "white", color: "#6b7280", border: "1px solid #e2e8f0",
              padding: "14px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px",
            }}
          >
            ล้าง
          </button>
        )}
        {loading && (
          <span style={{ color: "#6b7280", fontSize: "13px" }}>กำลังประมวลผลทุก sheet อาจใช้เวลา 10-30 วินาที...</span>
        )}
      </div>

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
            { label: "ข้ามแล้ว",   value: result.summary.skipped,  color: "#d97706", bg: "#fef3c7" },
            { label: "Error",      value: result.summary.errors,   color: "#dc2626", bg: "#fee2e2" },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: s.bg, borderRadius: "10px", padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "13px", color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      {result?.success && result.results && (
        <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
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
                    <div style={{ fontWeight: 700, color: "#2563EB", fontFamily: "monospace", fontSize: "12px" }}>{r.contractNo || "—"}</div>
                    <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px" }}>{r.sheetName}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{r.customerName ?? "—"}</td>
                  <td style={{ padding: "11px 14px", textAlign: "center" }}>
                    <span style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, fontSize: "12px" }}>
                      {r.itemsCreated}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "center" }}>
                    <span style={{ backgroundColor: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, fontSize: "12px" }}>
                      {r.assetsCreated}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "center", color: "#6b7280" }}>
                    {r.notificationsCreated > 0 ? `🔔 ${r.notificationsCreated}` : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      backgroundColor: STATUS_BG[r.status],
                      color: STATUS_COLOR[r.status],
                      padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 700,
                    }}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "#6b7280", fontSize: "12px", maxWidth: "280px" }}>
                    <span title={r.message}>{r.message.length > 60 ? r.message.slice(0, 60) + "..." : r.message}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Success action */}
      {result?.success && result.summary && result.summary.imported > 0 && (
        <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
          <Link href="/assets" style={{
            backgroundColor: "#7c3aed", color: "white", padding: "10px 24px",
            borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600,
          }}>
            🖥️ ดู Assets ที่นำเข้า
          </Link>
          <Link href="/contracts" style={{
            backgroundColor: "#1E3A5F", color: "white", padding: "10px 24px",
            borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600,
          }}>
            📄 ดู Contracts ที่นำเข้า
          </Link>
        </div>
      )}
    </div>
  );
}
