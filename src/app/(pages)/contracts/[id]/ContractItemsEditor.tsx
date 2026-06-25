"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { useMemo, useState } from "react";

const ITEM_TYPES = ["HARDWARE", "LICENSE", "SUBSCRIPTION", "SERVICE", "SUPPORT"] as const;
const SLA_OPTIONS = ["8x5xNBD", "8x5x4", "24x7xNBD", "24x7x4", "Best Effort"] as const;

const TYPE_COLOR: Record<string, string> = {
  HARDWARE: "#2563eb",
  LICENSE: "#7c3aed",
  SUBSCRIPTION: "#0891b2",
  SERVICE: "#059669",
  SUPPORT: "#d97706",
};

type ContractItemRow = {
  id: string;
  itemType: string;
  partNumber: string | null;
  description: string | null;
  serialNumber: string | null;
  quantity: number | null;
  unit: string | null;
  startDate: string | null;
  endDate: string | null;
  sla: string | null;
  remark: string | null;
  sortOrder: number;
  linkedAssetCode: string | null;
};

type AssetRow = {
  assetCode: string;
  serialNumber: string | null;
  brand: string;
  model: string;
};

type ItemForm = {
  itemType: string;
  partNumber: string;
  description: string;
  serialNumber: string;
  quantity: string;
  unit: string;
  sla: string;
  startDate: string;
  endDate: string;
  remark: string;
  syncAsset: boolean;
};

function toDateInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function daysLeft(end: string | null): number | null {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB") : "-";
}

function toForm(item: ContractItemRow): ItemForm {
  return {
    itemType: item.itemType,
    partNumber: item.partNumber ?? "",
    description: item.description ?? "",
    serialNumber: item.serialNumber ?? "",
    quantity: item.quantity?.toString() ?? "",
    unit: item.unit ?? "",
    sla: item.sla ?? "",
    startDate: toDateInput(item.startDate),
    endDate: toDateInput(item.endDate),
    remark: item.remark ?? "",
    syncAsset: true,
  };
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={{ color: "#9ca3af" }}>-</span>;
  const color = days < 0 ? "#ef4444" : days <= 30 ? "#f97316" : days <= 90 ? "#f59e0b" : "#10b981";
  const bg = days < 0 ? "#fee2e2" : days <= 30 ? "#fff7ed" : days <= 90 ? "#fef9c3" : "#d1fae5";
  const label = days < 0 ? `${Math.abs(days)}d ago` : `${days}d`;
  return (
    <span style={{ backgroundColor: bg, color, padding: "2px 8px", borderRadius: "99px", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const INPUT_STYLE = {
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  padding: "8px 10px",
  fontSize: "14px",
  width: "100%",
  fontFamily: "inherit",
  backgroundColor: "white",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#64748b",
  marginBottom: "4px",
};

export default function ContractItemsEditor({
  contractId,
  items,
  assets,
}: {
  contractId: string;
  items: ContractItemRow[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<ContractItemRow | null>(null);
  const [form, setForm] = useState<ItemForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const assetBySN = useMemo(
    () => new Map(assets.map((asset) => [asset.serialNumber?.toLowerCase() ?? "", asset])),
    [assets],
  );

  function openEdit(item: ContractItemRow) {
    setEditingItem(item);
    setForm(toForm(item));
    setMessage(null);
  }

  function closeEdit() {
    setEditingItem(null);
    setForm(null);
    setSaving(false);
  }

  function setField(field: keyof ItemForm, value: string | boolean) {
    setForm((current) => current ? { ...current, [field]: value } : current);
  }

  async function saveItem() {
    if (!editingItem || !form) return;

    const serialChanged = (editingItem.serialNumber ?? "") !== form.serialNumber.trim();
    if (serialChanged) {
      const confirmed = window.confirm("Serial number changed. Save this item and sync the linked asset if safe?");
      if (!confirmed) return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: form.itemType,
          partNumber: form.partNumber,
          description: form.description,
          serialNumber: form.serialNumber,
          quantity: form.quantity ? Number(form.quantity) : null,
          unit: form.unit,
          sla: form.sla,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          remark: form.remark,
          syncAsset: form.syncAsset,
          confirmSerialChange: serialChanged,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update item.");
      }

      closeEdit();
      setMessage(result.data.assetSynced ? "Item updated and linked asset synced." : "Item updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "17px" }}>Items ({items.length})</div>
            <div style={{ fontSize: "14px", color: "#9ca3af", marginTop: "2px" }}>
              Edit item rows. Asset warranty fields sync when enabled.
            </div>
          </div>
          {message && (
            <div role="status" style={{ color: message.includes("Unable") ? "#c2410c" : "#15803d", fontSize: "14px", fontWeight: 700 }}>
              {message}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>No items</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["#", "Part Number", "Description", "S/N or Sub ID", "Type", "SLA", "Start", "End", "Days Left", "Asset", "Remark", ""].map((header) => (
                    <th key={header} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "13px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const asset = item.serialNumber ? assetBySN.get(item.serialNumber.toLowerCase()) : undefined;
                  const itemDays = daysLeft(item.endDate);

                  return (
                    <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 600, fontSize: "14px" }}>{item.sortOrder || index + 1}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#374151", whiteSpace: "nowrap" }}>{item.partNumber ?? "-"}</td>
                      <td style={{ padding: "10px 12px", maxWidth: "260px" }}>
                        <div style={{ fontWeight: 600, color: "#1E3A5F", lineHeight: "1.4" }}>{item.description?.split("\n")[0] ?? "-"}</div>
                        {item.description?.includes("\n") && (
                          <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "2px" }}>{item.description.split("\n").slice(1).join(" ")}</div>
                        )}
                        {item.quantity && item.quantity > 1 && (
                          <div style={{ color: "#7c3aed", fontSize: "13px", marginTop: "2px" }}>x{item.quantity} {item.unit ?? ""}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#374151" }}>{item.serialNumber ?? <span style={{ color: "#d1d5db" }}>-</span>}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ backgroundColor: (TYPE_COLOR[item.itemType] ?? "#6b7280") + "18", color: TYPE_COLOR[item.itemType] ?? "#6b7280", padding: "2px 8px", borderRadius: "99px", fontSize: "13px", fontWeight: 700 }}>
                          {item.itemType}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>{item.sla ?? "-"}</td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>{formatDate(item.startDate)}</td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>{formatDate(item.endDate)}</td>
                      <td style={{ padding: "10px 12px" }}><DaysBadge days={itemDays} /></td>
                      <td style={{ padding: "10px 12px" }}>
                        {asset ? (
                          <Link href={`/assets?q=${encodeURIComponent(asset.serialNumber ?? asset.assetCode)}`} style={{ textDecoration: "none" }}>
                            <div style={{ backgroundColor: "#eff6ff", borderRadius: "6px", padding: "4px 8px", display: "inline-block" }}>
                              <div style={{ color: "#2563eb", fontWeight: 700, fontSize: "13px", fontFamily: "monospace" }}>{asset.assetCode}</div>
                              <div style={{ color: "#6b7280", fontSize: "13px" }}>{asset.brand} {asset.model}</div>
                            </div>
                          </Link>
                        ) : item.linkedAssetCode ? (
                          <span style={{ color: "#2563eb", fontSize: "13px", fontWeight: 700 }}>{item.linkedAssetCode}</span>
                        ) : item.serialNumber ? (
                          <span style={{ color: "#f59e0b", fontSize: "13px" }}>Asset not found</span>
                        ) : (
                          <span style={{ color: "#d1d5db", fontSize: "13px" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "13px", maxWidth: "150px" }}>{item.remark ?? "-"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          aria-label={`Edit item ${item.sortOrder || index + 1}`}
                          title="Edit item"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "white", color: "#1E3A5F", border: "1px solid #cbd5e1", borderRadius: "7px", padding: "6px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingItem && form && (
        <div role="dialog" aria-modal="true" aria-label="Edit contract item" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ width: "min(860px, 100%)", maxHeight: "90vh", overflowY: "auto", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 20px 50px rgba(15,23,42,.25)" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#1E3A5F" }}>Edit Contract Item</div>
                <div style={{ color: "#64748b", fontSize: "13px", marginTop: "2px" }}>Item {editingItem.sortOrder || "-"}</div>
              </div>
              <button type="button" onClick={closeEdit} aria-label="Close edit dialog" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", padding: "6px" }}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: "22px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-type">Type</label>
                <select id="item-type" value={form.itemType} onChange={(event) => setField("itemType", event.target.value)} style={INPUT_STYLE}>
                  {ITEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-sla">SLA</label>
                <select id="item-sla" value={form.sla} onChange={(event) => setField("sla", event.target.value)} style={INPUT_STYLE}>
                  {!SLA_OPTIONS.includes(form.sla as (typeof SLA_OPTIONS)[number]) && form.sla && <option value={form.sla}>{form.sla}</option>}
                  <option value="">-</option>
                  {SLA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-part">Part Number</label>
                <input id="item-part" value={form.partNumber} onChange={(event) => setField("partNumber", event.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-serial">Serial Number / Sub ID</label>
                <input id="item-serial" value={form.serialNumber} onChange={(event) => setField("serialNumber", event.target.value)} style={INPUT_STYLE} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL_STYLE} htmlFor="item-description">Description</label>
                <textarea id="item-description" value={form.description} onChange={(event) => setField("description", event.target.value)} style={{ ...INPUT_STYLE, minHeight: "80px", resize: "vertical" }} />
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-quantity">Quantity</label>
                <input id="item-quantity" type="number" min="1" value={form.quantity} onChange={(event) => setField("quantity", event.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-unit">Unit</label>
                <input id="item-unit" value={form.unit} onChange={(event) => setField("unit", event.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-start">Start Date</label>
                <input id="item-start" type="date" value={form.startDate} onChange={(event) => setField("startDate", event.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE} htmlFor="item-end">End Date</label>
                <input id="item-end" type="date" value={form.endDate} onChange={(event) => setField("endDate", event.target.value)} style={INPUT_STYLE} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL_STYLE} htmlFor="item-remark">Remark</label>
                <textarea id="item-remark" value={form.remark} onChange={(event) => setField("remark", event.target.value)} style={{ ...INPUT_STYLE, minHeight: "64px", resize: "vertical" }} />
              </div>
              <label style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", alignItems: "flex-start", color: "#334155", fontSize: "14px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#f8fafc" }}>
                <input type="checkbox" checked={form.syncAsset} onChange={(event) => setField("syncAsset", event.target.checked)} style={{ marginTop: "2px" }} />
                <span>
                  <strong>Sync linked asset</strong>
                  <span style={{ display: "block", color: "#64748b", marginTop: "2px" }}>
                    Updates asset part number, warranty start, warranty end, and serial number when it is safe.
                  </span>
                </span>
              </label>
            </div>

            <div style={{ padding: "16px 22px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={closeEdit} style={{ backgroundColor: "white", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "7px", padding: "9px 14px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
                Cancel
              </button>
              <button type="button" onClick={saveItem} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "7px", backgroundColor: "#1E3A5F", color: "white", border: "none", borderRadius: "7px", padding: "9px 14px", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}>
                <Save size={16} aria-hidden="true" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
