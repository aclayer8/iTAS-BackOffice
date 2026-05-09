"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Customer { id: string; companyName: string; shortName: string | null; }

export default function MoveCustomerButton({ sourceId, sourceName }: { sourceId: string; sourceName: string }) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Customer | null>(null);
  const [preview, setPreview]     = useState<{ contracts: number; assets: number; sites: number; licenses: number } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [moving, setMoving]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/customers?limit=500")
        .then(r => r.json())
        .then(d => setCustomers((d.data?.data ?? []).filter((c: Customer) => c.id !== sourceId)));
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch(""); setSelected(null); setPreview(null);
    }
  }, [open, sourceId]);

  useEffect(() => {
    if (!selected) { setPreview(null); return; }
    // Fetch counts for source customer
    Promise.all([
      fetch(`/api/customers/${sourceId}`).then(r => r.json()),
    ]).then(() => {
      // We'll get exact counts from the merge response; show estimate from customer data
      setPreview({ contracts: -1, assets: -1, sites: -1, licenses: -1 });
    });
  }, [selected, sourceId]);

  const filtered = customers.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (c.shortName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function doMove() {
    if (!selected) return;
    setMoving(true);
    try {
      const res = await fetch("/api/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId: selected.id }),
      });
      const data = await res.json();
      if (data.success) {
        const { contracts, assets, sites, licenses } = data.moved;
        alert(`ย้ายสำเร็จ!\nContracts: ${contracts} | Assets: ${assets} | Sites: ${sites} | Licenses: ${licenses}`);
        router.push("/customers/" + selected.id);
        router.refresh();
      } else {
        alert("Error: " + data.error);
      }
    } finally { setMoving(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
      >
        Move to...
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "28px", width: "520px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>Move customer data</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                ย้าย contracts, assets, sites ทั้งหมดจาก <strong>{sourceName}</strong> ไปยัง customer ที่เลือก แล้วลบ record นี้ออก
              </p>
            </div>

            <input
              ref={inputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              placeholder="ค้นหาชื่อบริษัท..."
              style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", marginBottom: "8px", outline: "none" }}
            />

            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "8px", marginBottom: "16px" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>ไม่พบผลลัพธ์</div>
              ) : filtered.slice(0, 50).map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f8fafc",
                    backgroundColor: selected?.id === c.id ? "#eff6ff" : "white",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{c.companyName}</div>
                    {c.shortName && <div style={{ fontSize: "12px", color: "#94a3b8" }}>{c.shortName}</div>}
                  </div>
                  {selected?.id === c.id && <span style={{ color: "#2563eb", fontSize: "18px" }}>✓</span>}
                </div>
              ))}
            </div>

            {selected && (
              <div style={{ backgroundColor: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#713f12" }}>
                <strong>ยืนยัน:</strong> ข้อมูลทั้งหมดของ <strong>{sourceName}</strong> จะถูกย้ายไปที่ <strong>{selected.companyName}</strong> และ record ปัจจุบันจะถูกลบ การกระทำนี้ไม่สามารถย้อนกลับได้
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)} style={{ backgroundColor: "white", color: "#64748b", border: "1px solid #e2e8f0", padding: "9px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                ยกเลิก
              </button>
              <button
                onClick={doMove}
                disabled={!selected || moving}
                style={{ backgroundColor: selected ? "#dc2626" : "#fca5a5", color: "white", border: "none", padding: "9px 24px", borderRadius: "8px", cursor: selected && !moving ? "pointer" : "not-allowed", fontSize: "14px", fontWeight: 700 }}
              >
                {moving ? "กำลังย้าย..." : "ย้ายข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
