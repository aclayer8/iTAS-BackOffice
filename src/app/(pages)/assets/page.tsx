import prisma from "@/lib/prisma";
import Link from "next/link";
import EditBrandModel from "./EditBrandModel";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, string> = {
  FIREWALL: "🔥", SWITCH: "🔀", WIRELESS_AP: "📡", SERVER: "🖥️",
  STORAGE: "💾", UPS: "🔋", ROUTER: "🌐", LOAD_BALANCER: "⚖️", OTHER: "📦",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981", WARRANTY_EXPIRED: "#f59e0b", EOS: "#f97316",
  EOL: "#ef4444", DECOMMISSIONED: "#6b7280", IN_STORAGE: "#8b5cf6", REPLACED: "#9ca3af",
};

function warrantyDays(end: Date | null) {
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

type SortCol =
  | "assetCode" | "brand" | "serialNumber" | "customer"
  | "warrantyEnd" | "lifecycleStatus" | "assetType" | "createdAt";
type SortOrder = "asc" | "desc";

function buildOrderBy(col: SortCol, order: SortOrder) {
  if (col === "customer") return { customer: { companyName: order } };
  return { [col]: order };
}

// column config: label, sort key (null = not sortable)
const COLUMNS: { label: string; key: SortCol | null }[] = [
  { label: "Type",         key: "assetType" },
  { label: "Asset Code",   key: "assetCode" },
  { label: "Brand / Model",key: "brand" },
  { label: "Serial No.",   key: "serialNumber" },
  { label: "Customer",     key: "customer" },
  { label: "Site",         key: null },
  { label: "Rack",         key: null },
  { label: "Warranty End", key: "warrantyEnd" },
  { label: "Days Left",    key: "warrantyEnd" }, // same field, different display
  { label: "Status",       key: "lifecycleStatus" },
];

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string; status?: string; type?: string; search?: string }>;
}) {
  const params  = await searchParams;
  const col     = (params.sort   ?? "warrantyEnd") as SortCol;
  const order   = (params.order  ?? "asc")         as SortOrder;
  const status  = params.status  ?? "";
  const typeFilter = params.type ?? "";
  const search = (params.search ?? "").trim();

  const assets = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      ...(status     ? { lifecycleStatus: status as never } : {}),
      ...(typeFilter ? { assetType:       typeFilter as never } : {}),
      ...(search ? {
        OR: [
          { assetCode:    { contains: search, mode: "insensitive" as const } },
          { brand:        { contains: search, mode: "insensitive" as const } },
          { model:        { contains: search, mode: "insensitive" as const } },
          { serialNumber: { contains: search, mode: "insensitive" as const } },
          { partNumber:   { contains: search, mode: "insensitive" as const } },
          { ipAddress:    { contains: search, mode: "insensitive" as const } },
          { rackLocation: { contains: search, mode: "insensitive" as const } },
          { customer:     { companyName: { contains: search, mode: "insensitive" as const } } },
          { site:         { siteName: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    },
    orderBy: buildOrderBy(col, order),
    include: {
      customer:      { select: { companyName: true } },
      site:          { select: { siteName: true } },
      engineerOwner: { select: { name: true } },
    },
  });

  // Counts for status filter badges
  const statusCounts = await prisma.asset.groupBy({
    by: ["lifecycleStatus"], where: { deletedAt: null },
    _count: { _all: true },
  });
  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s) => { statusMap[s.lifecycleStatus] = s._count._all; });

  // Summary: expiring soon
  const expiring30  = assets.filter(a => { const d = warrantyDays(a.warrantyEnd); return d !== null && d >= 0 && d <= 30; }).length;
  const expiring90  = assets.filter(a => { const d = warrantyDays(a.warrantyEnd); return d !== null && d > 30 && d <= 90; }).length;
  const expired     = assets.filter(a => { const d = warrantyDays(a.warrantyEnd); return d !== null && d < 0; }).length;

  function sortLink(key: SortCol) {
    const isActive   = col === key;
    const nextOrder  = isActive && order === "asc" ? "desc" : "asc";
    return `/assets?sort=${key}&order=${nextOrder}${status ? `&status=${status}` : ""}${typeFilter ? `&type=${typeFilter}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  }

  function filterLink(extraParams: string) {
    return `/assets?sort=${col}&order=${order}${extraParams ? `&${extraParams}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>← Dashboard</Link>
          <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "24px" }}>🖥️ Asset Tracking</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            {assets.length} assets{search ? ` matching "${search}"` : ""}
          </p>
        </div>
        <button style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
          + New Asset
        </button>
      </div>

      {/* Warranty summary pills */}
      {(expiring30 > 0 || expiring90 > 0 || expired > 0) && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          {expired > 0 && (
            <span style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "5px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: 700 }}>
              🔴 หมดประกันแล้ว {expired} รายการ
            </span>
          )}
          {expiring30 > 0 && (
            <span style={{ backgroundColor: "#ffedd5", color: "#ea580c", padding: "5px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: 700 }}>
              🟠 หมดใน 30 วัน {expiring30} รายการ
            </span>
          )}
          {expiring90 > 0 && (
            <span style={{ backgroundColor: "#fef9c3", color: "#b45309", padding: "5px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: 700 }}>
              🟡 หมดใน 90 วัน {expiring90} รายการ
            </span>
          )}
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { label: "ทั้งหมด",          value: "" },
          { label: "ACTIVE",           value: "ACTIVE" },
          { label: "WARRANTY EXPIRED", value: "WARRANTY_EXPIRED" },
          { label: "EOS",              value: "EOS" },
          { label: "EOL",              value: "EOL" },
          { label: "DECOMMISSIONED",   value: "DECOMMISSIONED" },
        ].map((tab) => {
          const active = status === tab.value;
          const cnt = tab.value === "" ? Object.values(statusMap).reduce((a, b) => a + b, 0) : (statusMap[tab.value] ?? 0);
          const href = filterLink(tab.value ? `status=${tab.value}` : "");
          return (
            <Link key={tab.value} href={href} style={{
              padding: "5px 13px", borderRadius: "99px", fontSize: "12px", fontWeight: 600,
              textDecoration: "none",
              backgroundColor: active ? "#1E3A5F" : "white",
              color: active ? "white" : "#6b7280",
              border: `1px solid ${active ? "#1E3A5F" : "#e2e8f0"}`,
            }}>
              {tab.label} <span style={{ opacity: .65, fontSize: "11px" }}>({cnt})</span>
            </Link>
          );
        })}
      </div>

      {/* Type filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { label: "ทุกประเภท", value: "" },
          { label: "🔥 Firewall",    value: "FIREWALL" },
          { label: "🔀 Switch",      value: "SWITCH" },
          { label: "📡 Wireless AP", value: "WIRELESS_AP" },
          { label: "🖥️ Server",      value: "SERVER" },
          { label: "💾 Storage",     value: "STORAGE" },
          { label: "🌐 Router",      value: "ROUTER" },
          { label: "📦 Other",       value: "OTHER" },
        ].map((tab) => {
          const active = typeFilter === tab.value;
          const href = filterLink(`${status ? `status=${status}&` : ""}${tab.value ? `type=${tab.value}` : ""}`);
          return (
            <Link key={tab.value} href={href} style={{
              padding: "5px 13px", borderRadius: "99px", fontSize: "12px", fontWeight: 600,
              textDecoration: "none",
              backgroundColor: active ? "#7c3aed" : "white",
              color: active ? "white" : "#6b7280",
              border: `1px solid ${active ? "#7c3aed" : "#e2e8f0"}`,
            }}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
              {COLUMNS.map(({ label, key }) => {
                // "Days Left" shares the warrantyEnd key but is a separate display column — skip duplicate header link
                const isDaysLeft = label === "Days Left";
                if (!key) {
                  return (
                    <th key={label} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {label}
                    </th>
                  );
                }
                // Both "Warranty End" and "Days Left" sort by the same warrantyEnd field
                const actuallyActive = col === key;
                const nextOrder = actuallyActive && order === "asc" ? "desc" : "asc";
                const arrow = actuallyActive ? (order === "asc" ? " ↑" : " ↓") : " ↕";
                return (
                  <th key={label} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                    <Link href={sortLink(key)} style={{
                      color: "white", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px",
                      opacity: actuallyActive ? 1 : 0.85,
                    }}>
                      {label}
                      <span style={{ fontSize: "11px", opacity: actuallyActive ? 1 : 0.45 }}>{arrow}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => {
              const days   = warrantyDays(a.warrantyEnd);
              const wColor = days === null ? "#9ca3af"
                           : days < 0    ? "#ef4444"
                           : days <= 30  ? "#f97316"
                           : days <= 90  ? "#f59e0b"
                           : "#10b981";
              return (
                <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {/* Type */}
                  <td style={{ padding: "12px 16px", fontSize: "20px" }}>{TYPE_ICON[a.assetType] ?? "📦"}</td>
                  {/* Asset Code */}
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#2563EB", fontFamily: "monospace", fontSize: "13px" }}>
                    {a.assetCode}
                  </td>
                  {/* Brand / Model */}
                  <td style={{ padding: "12px 16px" }}>
                    <EditBrandModel assetId={a.id} brand={a.brand} model={a.model} />
                  </td>
                  {/* Serial No. */}
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px" }}>
                    {a.serialNumber
                      ? <span style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px" }}>{a.serialNumber}</span>
                      : <span style={{ color: "#d1d5db" }}>N/A</span>}
                  </td>
                  {/* Customer */}
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{a.customer.companyName}</td>
                  {/* Site */}
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "13px" }}>{a.site?.siteName ?? "—"}</td>
                  {/* Rack */}
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#6b7280" }}>{a.rackLocation ?? "—"}</td>
                  {/* Warranty End */}
                  <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                    {a.warrantyEnd ? a.warrantyEnd.toLocaleDateString("en-GB") : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  {/* Days Left */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      color: wColor, fontWeight: "bold", fontSize: "13px",
                      ...(days !== null && days <= 90 && days >= 0 ? {
                        backgroundColor: wColor + "18", padding: "2px 8px", borderRadius: "99px"
                      } : {}),
                    }}>
                      {days === null ? "—"
                       : days < 0   ? `Expired ${Math.abs(days)}d`
                       : `${days}d`}
                    </span>
                  </td>
                  {/* Status */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      backgroundColor: (STATUS_COLOR[a.lifecycleStatus] ?? "#9ca3af") + "20",
                      color: STATUS_COLOR[a.lifecycleStatus] ?? "#9ca3af",
                      padding: "2px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "bold",
                    }}>
                      {a.lifecycleStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
                  ไม่พบ Asset
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
