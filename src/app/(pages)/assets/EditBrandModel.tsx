"use client";
import { useState } from "react";

interface Props {
  assetId: string;
  brand: string;
  model: string;
}

export default function EditBrandModel({ assetId, brand: initBrand, model: initModel }: Props) {
  const [editing, setEditing] = useState(false);
  const [brand, setBrand] = useState(initBrand);
  const [model, setModel] = useState(initModel);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, model }),
      });
      if (res.ok) {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>{brand}</div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{model}</div>
        </div>
        <button
          onClick={() => setEditing(true)}
          title="แก้ไข Brand / Model"
          style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "13px", padding: "2px 4px", borderRadius: "4px", lineHeight: 1, marginTop: "2px" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#2563eb")}
          onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
        >
          ✏️
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px" }}>
      <input
        value={brand}
        onChange={e => setBrand(e.target.value)}
        placeholder="Brand"
        style={{ fontSize: "13px", padding: "4px 8px", border: "1px solid #3b82f6", borderRadius: "6px", outline: "none", width: "100%" }}
      />
      <input
        value={model}
        onChange={e => setModel(e.target.value)}
        placeholder="Part No. / Model"
        style={{ fontSize: "12px", padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none", width: "100%" }}
      />
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ flex: 1, backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "5px", padding: "4px 8px", fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600 }}
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          onClick={() => { setBrand(initBrand); setModel(initModel); setEditing(false); }}
          style={{ flex: 1, backgroundColor: "#f1f5f9", color: "#374151", border: "none", borderRadius: "5px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
