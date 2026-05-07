import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981", DRAFT: "#6b7280", EXPIRED: "#ef4444",
  CANCELLED: "#9ca3af", PENDING_RENEWAL: "#f59e0b",
};

function daysLeft(end: Date) {
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

type SortCol = "contractNo" | "customer" | "endDate" | "startDate" | "status" | "slaType";
type SortOrder = "asc" | "desc";

function buildOrderBy(col: SortCol, order: SortOrder) {
  if (col === "customer") return { customer: { companyName: order } };
  return { [col]: order };
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string; status?: string }>;
}) {
  const params = await searchParams;
  const col    = (params.sort  ?? "endDate")  as SortCol;
  const order  = (params.order ?? "asc")      as SortOrder;
  const status = params.status ?? "";

  const contracts = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: buildOrderBy(col, order),
    include: {
      customer: { select: { companyName: true } },
      site:     { select: { siteName: true } },
      vendor:   { select: { name: true } },
      _count:   { select: { items: true } },
    },
  });

  const counts = await prisma.contract.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  const countMap: Record<string, number> = {};
  counts.forEach((c) => { countMap[c.status] = c._count._all; });

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "16px" }}>&larr; Dashboard</Link>
          <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "26px" }}>Contract Management</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>{contracts.length} contracts</p>
        </div>
        <button style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>
          + New Contract
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { label: "All", value: "" },
          { label: "ACTIVE",          value: "ACTIVE" },
          { label: "EXPIRED",         value: "EXPIRED" },
          { label: "PENDING RENEWAL", value: "PENDING_RENEWAL" },
          { label: "DRAFT",           value: "DRAFT" },
        ].map((tab) => {
          const active = status === tab.value;
          const cnt = tab.value === "" ? contracts.length : (countMap[tab.value] ?? 0);
          const href = `/contracts?sort=${col}&order=${order}${tab.value ? `&status=${tab.value}` : ""}`;
          return (
            <Link key={tab.value} href={href} style={{
              padding: "6px 14px", borderRadius: "99px", fontSize: "15px", fontWeight: 600,
              textDecoration: "none",
              backgroundColor: active ? "#1E3A5F" : "white",
              color: active ? "white" : "#6b7280",
              border: `1px solid ${active ? "#1E3A5F" : "#e2e8f0"}`,
            }}>
              {tab.label} {tab.value !== "" && <span style={{ opacity: .7, fontSize: "13px" }}>({cnt})</span>}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
              {[
                { label: "Contract No", key: "contractNo" },
                { label: "Customer",    key: "customer" },
                { label: "Site",        key: null },
                { label: "Vendor",      key: null },
                { label: "SLA",         key: "slaType" },
                { label: "Start",       key: "startDate" },
                { label: "End",         key: "endDate" },
                { label: "Days Left",   key: null },
                { label: "Items",       key: null },
                { label: "Status",      key: "status" },
              ].map(({ label, key }) => {
                if (!key) {
                  return (
                    <th key={label} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", userSelect: "none" }}>
                      {label}
                    </th>
                  );
                }
                const isActive = col === key;
                const nextOrder = isActive && order === "asc" ? "desc" : "asc";
                const arrow = isActive ? (order === "asc" ? " ↑" : " ↓") : " ↕";
                const href = `/contracts?sort=${key}&order=${nextOrder}${status ? `&status=${status}` : ""}`;
                return (
                  <th key={label} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                    <Link href={href} style={{
                      color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px",
                      opacity: isActive ? 1 : 0.85,
                    }}>
                      {label}
                      <span style={{ fontSize: "14px", opacity: isActive ? 1 : 0.5 }}>{arrow}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {contracts.map((c, i) => {
              const days = daysLeft(c.endDate);
              const dayColor = days < 0 ? "#ef4444" : days <= 30 ? "#f97316" : days <= 90 ? "#f59e0b" : "#10b981";
              return (
                <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "monospace" }}>
                    <Link href={`/contracts/${c.id}`} style={{ color: "#2563EB", textDecoration: "none" }}>
                      {c.contractNo}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.customer.companyName}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "15px" }}>{c.site?.siteName ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "15px" }}>{c.vendor?.name ?? "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: "14px" }}>{c.slaType.replace(/_/g, " ")}</td>
                  <td style={{ padding: "12px 16px", fontSize: "15px" }}>{c.startDate.toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "12px 16px", fontSize: "15px" }}>{c.endDate.toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: dayColor, fontWeight: "bold", fontSize: "15px" }}>
                      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{c._count.items}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ backgroundColor: STATUS_COLOR[c.status] + "20", color: STATUS_COLOR[c.status], padding: "2px 10px", borderRadius: "99px", fontSize: "14px", fontWeight: "bold" }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
                  No contracts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
