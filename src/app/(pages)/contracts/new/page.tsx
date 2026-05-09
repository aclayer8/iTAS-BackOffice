"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

interface Customer {
  id: string;
  companyName: string;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

interface Item {
  partNumber: string;
  description: string;
  quantity: string;
  unit: string;
  sla: string;
  startDate: string;
  endDate: string;
  serialNumber: string;
  remark: string;
}

const EMPTY_ITEM: Item = {
  partNumber: "", description: "", quantity: "1", unit: "EA",
  sla: "8x5 NBD", startDate: "", endDate: "", serialNumber: "", remark: "",
};

const INPUT = {
  border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 10px",
  fontSize: "14px", width: "100%", outline: "none", fontFamily: "inherit",
  backgroundColor: "white",
};
const LABEL = { fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px", display: "block" as const };

function fmtDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

function exportExcel(
  form: { contractNo: string; poNo: string; soNo: string; date: string; serviceDesc: string; remark: string },
  customer: { companyName: string; address: string | null; contactPerson: string | null; contactPhone: string | null; contactEmail: string | null },
  items: Item[]
) {
  const wb = XLSX.utils.book_new();
  const ws_data: unknown[][] = [
    ["Certification of Maintenance Service"],
    [""],
    ["Contract No", ":", form.contractNo, "", "Date", ":", fmtDate(form.date)],
    ["Purchase Order No.", ":", form.poNo, "", "Helpdesk Hotline", ":", "099-456-6951, 089-672-2622"],
    ["Service Description", ":", form.serviceDesc, "", "Service E-mail", ":", "support@i-tas.co.th"],
    ["", ":", form.remark, "", "Website", ":", "http://www.i-tas.co.th"],
    [""],
    ["Customer"],
    ["Name", ":", customer.companyName],
    ["Address", ":", customer.address ?? ""],
    ["Contact Person", ":", customer.contactPerson ?? ""],
    ["Phone", ":", customer.contactPhone ?? ""],
    ["E-mail", ":", customer.contactEmail ?? ""],
    [""],
    ["Item", "Part Number", "Description", "Quantity", "Unit", "SLA", "Start date", "End date", "Remark"],
  ];

  const validItems = items.filter(it => it.description || it.partNumber);
  validItems.forEach((it, idx) => {
    ws_data.push([
      idx + 1,
      it.partNumber,
      it.description,
      parseInt(it.quantity) || 1,
      it.unit,
      it.sla,
      fmtDate(it.startDate),
      fmtDate(it.endDate),
      it.remark,
    ]);
  });
  // Pad to at least 10 item rows
  for (let i = validItems.length; i < 10; i++) {
    ws_data.push([i + 1, "", "", "", "", "", "", "", ""]);
  }

  ws_data.push([""], ['For full terms and conditions of this maintenance agreement, please refer to "iTAS Solutions Service Policy"']);
  ws_data.push([""], ["Customer Signature", "", "", "", "Company Signature"]);
  ws_data.push([""], ["("+( customer.contactPerson || "________________________" )+")", "", "", "", "( AREE JARUMANEERAT )"]);
  ws_data.push(["Date : _______________", "", "", "", "Date : "+fmtDate(form.date)]);

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, { wch: 18 }, { wch: 35 }, { wch: 8 }, { wch: 8 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Certification");
  const filename = (form.contractNo || "contract").replace(/[^a-zA-Z0-9-_]/g, "_") + ".xlsx";
  XLSX.writeFile(wb, filename);
}

function NewContractForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customerId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customer, setCustomer] = useState<Omit<Customer,"id">>({
    companyName: "", address: "", contactPerson: "", contactPhone: "", contactEmail: "",
  });
  const [form, setForm] = useState({
    contractNo: "", poNo: "", soNo: "", date: new Date().toISOString().slice(0,10),
    serviceDesc: "", remark: "",
  });
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch("/api/customers?limit=500")
      .then(r => r.json())
      .then(d => {
        const list: Customer[] = d.data?.data ?? [];
        setCustomers(list);
        // Pre-select customer if customerId was passed in URL
        if (presetCustomerId) {
          const c = list.find(x => x.id === presetCustomerId);
          if (c) {
            setSelectedCustomerId(c.id);
            setCustomer({
              companyName: c.companyName, address: c.address ?? "",
              contactPerson: c.contactPerson ?? "", contactPhone: c.contactPhone ?? "", contactEmail: c.contactEmail ?? "",
            });
          }
        }
      });
  }, [presetCustomerId]);

  function selectCustomer(id: string) {
    setSelectedCustomerId(id);
    const c = customers.find(x => x.id === id);
    if (c) setCustomer({
      companyName: c.companyName, address: c.address ?? "",
      contactPerson: c.contactPerson ?? "", contactPhone: c.contactPhone ?? "", contactEmail: c.contactEmail ?? "",
    });
  }

  function setItem(idx: number, field: keyof Item, val: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }
  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  async function save() {
    if (!form.contractNo) { alert("กรุณากรอก Contract No."); return; }
    if (!customer.companyName) { alert("กรุณาเลือกหรือกรอกชื่อ Customer"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/contracts/certification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, customer, customerId: selectedCustomerId || null, items }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/contracts/${data.contractId}`);
      } else {
        alert("Error: " + data.error);
      }
    } finally { setSaving(false); }
  }

  if (preview) return (
    <PrintPreview form={form} customer={customer} items={items}
      onBack={() => setPreview(false)} onSave={save} saving={saving}
      onExcel={() => exportExcel(form, customer, items)} />
  );

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <a href="/contracts" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>&larr; Contracts</a>
          <h1 style={{ margin: "8px 0 0", color: "#1E3A5F", fontSize: "24px", fontWeight: 800 }}>
            สร้าง Certification of Maintenance Service
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
          {/* Left: Main form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Contract Info */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                ข้อมูล Contract
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={LABEL}>Contract No. *</label>
                  <input style={INPUT} value={form.contractNo}
                    onChange={e => setForm(p => ({ ...p, contractNo: e.target.value }))}
                    placeholder="เช่น iTAS-MA260062" />
                </div>
                <div>
                  <label style={LABEL}>Date</label>
                  <input style={INPUT} type="date" value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label style={LABEL}>PO No.</label>
                  <input style={INPUT} value={form.poNo}
                    onChange={e => setForm(p => ({ ...p, poNo: e.target.value }))}
                    placeholder="เช่น PO5600003584" />
                </div>
                <div>
                  <label style={LABEL}>SO No.</label>
                  <input style={INPUT} value={form.soNo}
                    onChange={e => setForm(p => ({ ...p, soNo: e.target.value }))}
                    placeholder="เช่น SO26-0062" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LABEL}>Service Description</label>
                  <input style={INPUT} value={form.serviceDesc}
                    onChange={e => setForm(p => ({ ...p, serviceDesc: e.target.value }))}
                    placeholder="เช่น MA Cisco 2026" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LABEL}>Remark</label>
                  <input style={INPUT} value={form.remark}
                    onChange={e => setForm(p => ({ ...p, remark: e.target.value }))}
                    placeholder="เช่น (SO26-0005)" />
                </div>
              </div>
            </div>

            {/* Customer */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                Customer
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={LABEL}>เลือกจากรายการ (หรือกรอกเองด้านล่าง)</label>
                <select style={{ ...INPUT, backgroundColor: "#f8fafc" }}
                  value={selectedCustomerId} onChange={e => selectCustomer(e.target.value)}>
                  <option value="">— เลือก Customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LABEL}>ชื่อบริษัท *</label>
                  <input style={INPUT} value={customer.companyName}
                    onChange={e => setCustomer(p => ({ ...p, companyName: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LABEL}>Address</label>
                  <textarea style={{ ...INPUT, minHeight: "60px", resize: "vertical" }} value={customer.address ?? ""}
                    onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <label style={LABEL}>Contact Person</label>
                  <input style={INPUT} value={customer.contactPerson ?? ""}
                    onChange={e => setCustomer(p => ({ ...p, contactPerson: e.target.value }))} />
                </div>
                <div>
                  <label style={LABEL}>Phone</label>
                  <input style={INPUT} value={customer.contactPhone ?? ""}
                    onChange={e => setCustomer(p => ({ ...p, contactPhone: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LABEL}>E-mail</label>
                  <input style={INPUT} value={customer.contactEmail ?? ""}
                    onChange={e => setCustomer(p => ({ ...p, contactEmail: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>รายการอุปกรณ์ / Items</span>
                <button onClick={addItem} style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                  + เพิ่มรายการ
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      {["Part No.", "Description", "S/N", "Qty", "Unit", "SLA", "Start", "End", "Remark", ""].map(h => (
                        <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        {(["partNumber","description","serialNumber","quantity","unit","sla","startDate","endDate","remark"] as (keyof Item)[]).map(f => (
                          <td key={f} style={{ padding: "4px 4px" }}>
                            <input
                              type={f === "startDate" || f === "endDate" ? "date" : "text"}
                              value={item[f]}
                              onChange={e => setItem(idx, f, e.target.value)}
                              style={{ ...INPUT, padding: "4px 6px", fontSize: "12px", minWidth: f === "description" ? "160px" : f === "partNumber" ? "120px" : f === "serialNumber" ? "110px" : "60px" }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: "4px" }}>
                          <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "16px", padding: "2px 6px" }}>x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Actions + Fixed info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button onClick={() => setPreview(true)} style={{ backgroundColor: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                  Preview / Print PDF
                </button>
                <button onClick={() => exportExcel(form, customer, items)} style={{ backgroundColor: "#16a34a", color: "white", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                  Export Excel (.xlsx)
                </button>
                <button onClick={save} disabled={saving} style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "10px", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}>
                  {saving ? "กำลังบันทึก..." : "บันทึก Contract"}
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: "#f0fdf4", borderRadius: "12px", padding: "16px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803d", marginBottom: "10px" }}>ข้อมูลบริษัท (Fixed)</div>
              {[
                ["Helpdesk Hotline", "099-456-6951, 089-672-2622"],
                ["Service E-mail", "support@i-tas.co.th"],
                ["Website", "http://www.i-tas.co.th"],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: "12px", color: "#1e293b" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", color: "#6b7280" }}>Loading...</div>}>
      <NewContractForm />
    </Suspense>
  );
}

// Print Preview
function PrintPreview({ form, customer, items, onBack, onSave, saving, onExcel }: {
  form: { contractNo: string; poNo: string; soNo: string; date: string; serviceDesc: string; remark: string };
  customer: { companyName: string; address: string | null; contactPerson: string | null; contactPhone: string | null; contactEmail: string | null };
  items: Item[];
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  onExcel: () => void;
}) {
  const validItems = items.filter(it => it.description || it.partNumber);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#f1f5f9", minHeight: "100vh", padding: "24px" }}>
      {/* Action bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }} className="no-print">
        <button onClick={onBack} style={{ backgroundColor: "white", border: "1px solid #e2e8f0", padding: "8px 20px", borderRadius: "7px", cursor: "pointer", fontSize: "14px" }}>
          Back
        </button>
        <button onClick={() => window.print()} style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
          Print / Save PDF
        </button>
        <button onClick={onExcel} style={{ backgroundColor: "#16a34a", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
          Export Excel
        </button>
        <button onClick={onSave} disabled={saving} style={{ backgroundColor: "#059669", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}>
          {saving ? "กำลังบันทึก..." : "บันทึก Contract"}
        </button>
      </div>

      {/* A4 Paper */}
      <div style={{ width: "794px", margin: "0 auto", backgroundColor: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", padding: "40px 48px", minHeight: "1123px" }}>
        {/* Logo + Title */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <tbody><tr>
            <td style={{ width: "100px", verticalAlign: "top" }}>
              <div style={{ width: "80px", height: "80px", border: "2px solid #1E3A5F", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "#D41E28" }}>iTAS</div>
            </td>
            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#D41E28", letterSpacing: "2px" }}>Certification of Maintenance Service</div>
            </td>
          </tr></tbody>
        </table>

        {/* Contract info table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={{ width: "140px", fontWeight: 700, paddingBottom: "4px" }}>Contract No</td>
              <td style={{ width: "8px" }}>:</td>
              <td style={{ fontWeight: 700, color: "#D41E28" }}>{form.contractNo}</td>
              <td style={{ width: "120px", fontWeight: 700 }}>Date</td>
              <td style={{ width: "8px" }}>:</td>
              <td>{fmtDate(form.date)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, paddingBottom: "4px" }}>Purchase Order No.</td>
              <td>:</td>
              <td>{form.poNo}</td>
              <td style={{ fontWeight: 700 }}>Helpdesk Hotline</td>
              <td>:</td>
              <td>099-456-6951, 089-672-2622</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, paddingBottom: "4px" }}>Service Description</td>
              <td>:</td>
              <td>{form.serviceDesc}</td>
              <td style={{ fontWeight: 700 }}>Service E-mail</td>
              <td>:</td>
              <td style={{ color: "#2563eb" }}>support@i-tas.co.th</td>
            </tr>
            {form.remark ? <tr>
              <td style={{ paddingBottom: "4px" }}></td><td>:</td>
              <td>{form.remark}</td>
              <td style={{ fontWeight: 700 }}>Website</td>
              <td>:</td>
              <td>http://www.i-tas.co.th</td>
            </tr> : <tr>
              <td colSpan={3}></td>
              <td style={{ fontWeight: 700 }}>Website</td>
              <td>:</td>
              <td>http://www.i-tas.co.th</td>
            </tr>}
          </tbody>
        </table>

        <div style={{ height: "8px" }} />

        {/* Customer */}
        <div style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#1E3A5F" }}>Customer</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {([
                ["Name", customer.companyName],
                ["Address", customer.address],
                ["Contact Person", customer.contactPerson],
                ["Phone", customer.contactPhone],
                ["E-mail", customer.contactEmail],
              ] as [string, string | null][]).map(([k, v]) => v ? (
                <tr key={k}>
                  <td style={{ width: "120px", fontWeight: 600, paddingBottom: "3px" }}>{k}</td>
                  <td style={{ width: "8px" }}>:</td>
                  <td style={{ paddingBottom: "3px" }}>{v}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
              {["Item","Part Number","Description","Quantity","Unit","SLA","Start date","End date","Remark"].map(h => (
                <th key={h} style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600, border: "1px solid #1E3A5F", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "white" : "#f8fafc" }}>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>{idx + 1}</td>
                <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{item.partNumber}</td>
                <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0" }}>{item.description}</td>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>{item.quantity}</td>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>{item.unit}</td>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>{item.sla}</td>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{fmtDate(item.startDate)}</td>
                <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{fmtDate(item.endDate)}</td>
                <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0" }}>{item.remark}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 10 - validItems.length) }).map((_, i) => (
              <tr key={"e"+i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} style={{ padding: "5px 8px", border: "1px solid #e2e8f0", height: "22px" }}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: "16px", fontSize: "11px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
          For full terms and conditions of this maintenance agreement, please refer to &quot;iTAS Solutions Service Policy&quot;
        </div>

        {/* Signatures */}
        <table style={{ width: "100%", marginTop: "32px", fontSize: "12px" }}>
          <tbody><tr>
            <td style={{ width: "45%", textAlign: "center" }}>
              <div style={{ fontWeight: 700, marginBottom: "40px" }}>Customer Signature</div>
              <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px" }}>({customer.contactPerson || "                               "})</div>
              <div style={{ marginTop: "4px" }}>Date : _______________</div>
            </td>
            <td style={{ width: "10%" }} />
            <td style={{ width: "45%", textAlign: "center" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px" }}>Company Signature</div>
              <div style={{ fontSize: "28px", fontFamily: "cursive", color: "#1e293b", marginBottom: "8px" }}>Aree.j</div>
              <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px" }}>( AREE JARUMANEERAT )</div>
              <div style={{ marginTop: "4px" }}>Date : {fmtDate(form.date)}</div>
            </td>
          </tr></tbody>
        </table>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
    </div>
  );
}

}

}
