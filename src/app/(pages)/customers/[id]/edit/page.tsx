"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "PROSPECT", "BLACKLISTED"];
const TIER_OPTIONS   = ["", "PLATINUM", "GOLD", "SILVER", "BRONZE"];

const INPUT: React.CSSProperties = {
  border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px",
  fontSize: "14px", width: "100%", outline: "none", fontFamily: "inherit",
  backgroundColor: "white", boxSizing: "border-box",
};
const LABEL: React.CSSProperties = {
  fontSize: "12px", fontWeight: 700, color: "#64748b",
  marginBottom: "4px", display: "block", textTransform: "uppercase", letterSpacing: "0.5px",
};
const SECTION: React.CSSProperties = {
  backgroundColor: "white", borderRadius: "12px", padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "20px",
};
const SECTION_TITLE: React.CSSProperties = {
  fontSize: "15px", fontWeight: 700, color: "#1e293b",
  marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9",
};

type Form = {
  companyName: string; shortName: string; taxId: string;
  status: string; tier: string;
  contactPerson: string; contactPhone: string; contactEmail: string;
  address: string; billingAddress: string; website: string; industry: string; note: string;
};

const EMPTY: Form = {
  companyName: "", shortName: "", taxId: "", status: "ACTIVE", tier: "",
  contactPerson: "", contactPhone: "", contactEmail: "",
  address: "", billingAddress: "", website: "", industry: "", note: "",
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState<Form>(EMPTY);

  useEffect(() => {
    fetch("/api/customers/" + id)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const c = d.data;
          setForm({
            companyName:    c.companyName    ?? "",
            shortName:      c.shortName      ?? "",
            taxId:          c.taxId          ?? "",
            status:         c.status         ?? "ACTIVE",
            tier:           c.tier           ?? "",
            contactPerson:  c.contactPerson  ?? "",
            contactPhone:   c.contactPhone   ?? "",
            contactEmail:   c.contactEmail   ?? "",
            address:        c.address        ?? "",
            billingAddress: c.billingAddress ?? "",
            website:        c.website        ?? "",
            industry:       c.industry       ?? "",
            note:           c.note           ?? "",
          });
        }
        setLoading(false);
      });
  }, [id]);

  function set(field: keyof Form, val: string) {
    setForm(p => ({ ...p, [field]: val }));
  }

  async function save() {
    if (!form.companyName.trim()) { alert("กรุณากรอกชื่อบริษัท"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/customers/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName:    form.companyName.trim(),
          shortName:      form.shortName.trim()      || "",
          taxId:          form.taxId.trim()          || "",
          status:         form.status,
          tier:           form.tier                  || "",
          contactPerson:  form.contactPerson.trim()  || "",
          contactPhone:   form.contactPhone.trim()   || "",
          contactEmail:   form.contactEmail.trim()   || "",
          address:        form.address.trim()        || "",
          billingAddress: form.billingAddress.trim() || "",
          website:        form.website.trim()        || "",
          industry:       form.industry.trim()       || "",
          note:           form.note.trim()           || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/customers/" + id);
      } else {
        alert("Error: " + data.error);
      }
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "64px", textAlign: "center", color: "#6b7280" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        <div style={{ marginBottom: "24px" }}>
          <a href={"/customers/" + id} style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>&larr; {form.companyName || "Customer"}</a>
          <h1 style={{ margin: "8px 0 0", color: "#1E3A5F", fontSize: "26px", fontWeight: 800 }}>แก้ไขข้อมูล Customer</h1>
        </div>

        {/* Company Info */}
        <div style={SECTION}>
          <div style={SECTION_TITLE}>ข้อมูลบริษัท</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={LABEL}>Company Name *</label>
              <input style={INPUT} value={form.companyName} onChange={e => set("companyName", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Short Name</label>
              <input style={INPUT} value={form.shortName} onChange={e => set("shortName", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label style={LABEL}>Tax ID</label>
              <input style={INPUT} value={form.taxId} onChange={e => set("taxId", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Status</label>
              <select style={INPUT} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Tier</label>
              <select style={INPUT} value={form.tier} onChange={e => set("tier", e.target.value)}>
                {TIER_OPTIONS.map(t => <option key={t} value={t}>{t || "— ไม่ระบุ —"}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div style={SECTION}>
          <div style={SECTION_TITLE}>ผู้ติดต่อ</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label style={LABEL}>Contact Person</label>
              <input style={INPUT} value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Phone</label>
              <input style={INPUT} value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Email</label>
              <input style={INPUT} value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} type="email" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={SECTION}>
          <div style={SECTION_TITLE}>ที่อยู่</div>
          <div style={{ marginBottom: "16px" }}>
            <label style={LABEL}>Address</label>
            <textarea style={{ ...INPUT, minHeight: "72px", resize: "vertical" }} value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Billing Address (ถ้าต่างจากที่อยู่หลัก)</label>
            <textarea style={{ ...INPUT, minHeight: "72px", resize: "vertical" }} value={form.billingAddress} onChange={e => set("billingAddress", e.target.value)} />
          </div>
        </div>

        {/* Other */}
        <div style={SECTION}>
          <div style={SECTION_TITLE}>ข้อมูลเพิ่มเติม</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={LABEL}>Website</label>
              <input style={INPUT} value={form.website} onChange={e => set("website", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Industry</label>
              <input style={INPUT} value={form.industry} onChange={e => set("industry", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={LABEL}>Note</label>
            <textarea style={{ ...INPUT, minHeight: "72px", resize: "vertical" }} value={form.note} onChange={e => set("note", e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <a href={"/customers/" + id} style={{ backgroundColor: "white", color: "#64748b", border: "1px solid #e2e8f0", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
            ยกเลิก
          </a>
          <button onClick={save} disabled={saving} style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "10px 28px", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>

      </div>
    </div>
  );
}
