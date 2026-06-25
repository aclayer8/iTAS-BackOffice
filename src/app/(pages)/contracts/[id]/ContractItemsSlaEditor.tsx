"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
};

type AssetRow = {
  assetCode: string;
  serialNumber: string | null;
  brand: string;
  model: string;
};

function daysLeft(end: string | null): number | null {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB") : "-";
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

export default function ContractItemsSlaEditor({
  contractId,
  items,
  assets,
}: {
  contractId: string;
  items: ContractItemRow[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sla, setSla] = useState<(typeof SLA_OPTIONS)[number]>("24x7x4");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const assetBySN = useMemo(
    () => new Map(assets.map((asset) => [asset.serialNumber?.toLowerCase() ?? "", asset])),
    [assets],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function toggleItem(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  async function applySla() {
    if (selectedIds.length === 0) {
      setMessage("Select at least one item first.");
      return;
    }

    const confirmed = window.confirm(`Update SLA for ${selectedIds.length} selected item(s) to ${sla}?`);
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/items/sla`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedIds, sla }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update SLA.");
      }

      setSelectedIds([]);
      setMessage(`Updated ${result.data.updatedCount} item(s) to ${sla}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update SLA.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "17px" }}>
            Items ({items.length})
          </div>
          <div style={{ fontSize: "14px", color: "#9ca3af", marginTop: "2px" }}>
            {assets.length > 0 ? `${assets.length} linked assets` : "No linked assets"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <label htmlFor="bulk-sla" style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
            Set SLA
          </label>
          <select
            id="bulk-sla"
            value={sla}
            onChange={(event) => setSla(event.target.value as (typeof SLA_OPTIONS)[number])}
            style={{ border: "1px solid #cbd5e1", borderRadius: "7px", padding: "7px 10px", fontSize: "14px", backgroundColor: "white" }}
          >
            {SLA_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applySla}
            disabled={saving || selectedIds.length === 0}
            style={{
              backgroundColor: selectedIds.length === 0 ? "#cbd5e1" : "#1E3A5F",
              color: "white",
              border: "none",
              borderRadius: "7px",
              padding: "8px 14px",
              cursor: saving || selectedIds.length === 0 ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {saving ? "Updating..." : `Apply (${selectedIds.length})`}
          </button>
        </div>
      </div>

      {message && (
        <div role="status" style={{ padding: "10px 20px", backgroundColor: message.startsWith("Updated") ? "#f0fdf4" : "#fff7ed", color: message.startsWith("Updated") ? "#15803d" : "#c2410c", fontSize: "14px", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>No items</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <input
                    type="checkbox"
                    aria-label="Select all items"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                {["#", "Part Number", "Description", "S/N or Sub ID", "Type", "SLA", "Start", "End", "Days Left", "Asset", "Remark"].map((header) => (
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
                const selected = selectedSet.has(item.id);

                return (
                  <tr key={item.id} style={{ backgroundColor: selected ? "#eff6ff" : index % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <input
                        type="checkbox"
                        aria-label={`Select item ${item.sortOrder || index + 1}`}
                        checked={selected}
                        onChange={() => toggleItem(item.id)}
                      />
                    </td>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 600, fontSize: "14px" }}>{item.sortOrder || index + 1}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#374151", whiteSpace: "nowrap" }}>
                      {item.partNumber ?? "-"}
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: "260px" }}>
                      <div style={{ fontWeight: 600, color: "#1E3A5F", lineHeight: "1.4" }}>
                        {item.description?.split("\n")[0] ?? "-"}
                      </div>
                      {item.description?.includes("\n") && (
                        <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "2px" }}>
                          {item.description.split("\n").slice(1).join(" ")}
                        </div>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <div style={{ color: "#7c3aed", fontSize: "13px", marginTop: "2px" }}>
                          x{item.quantity} {item.unit ?? ""}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#374151" }}>
                      {item.serialNumber ?? <span style={{ color: "#d1d5db" }}>-</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        backgroundColor: (TYPE_COLOR[item.itemType] ?? "#6b7280") + "18",
                        color: TYPE_COLOR[item.itemType] ?? "#6b7280",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}>
                        {item.itemType}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>
                      {item.sla ?? "-"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>
                      {formatDate(item.startDate)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>
                      {formatDate(item.endDate)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <DaysBadge days={itemDays} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {asset ? (
                        <Link href={`/assets?q=${encodeURIComponent(asset.serialNumber ?? asset.assetCode)}`} style={{ textDecoration: "none" }}>
                          <div style={{ backgroundColor: "#eff6ff", borderRadius: "6px", padding: "4px 8px", display: "inline-block" }}>
                            <div style={{ color: "#2563eb", fontWeight: 700, fontSize: "13px", fontFamily: "monospace" }}>{asset.assetCode}</div>
                            <div style={{ color: "#6b7280", fontSize: "13px" }}>{asset.brand} {asset.model}</div>
                          </div>
                        </Link>
                      ) : item.serialNumber ? (
                        <span style={{ color: "#f59e0b", fontSize: "13px" }}>Asset not found</span>
                      ) : (
                        <span style={{ color: "#d1d5db", fontSize: "13px" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "13px", maxWidth: "150px" }}>
                      {item.remark ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
