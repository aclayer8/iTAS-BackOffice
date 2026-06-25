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

function effectiveContractStatus(status: string, endDate: Date) {
  const days = daysLeft(endDate);
  if (status === "ACTIVE" && days < -30) return "EXPIRED";
  if (status === "ACTIVE" && days < 0) return "PENDING_RENEWAL";
  return status;
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
  searchParams: Promise<{ sort?: string; order?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const col    = (params.sort  ?? "contractNo") as SortCol;
  const order  = (params.order ?? "desc")       as SortOrder;
  const status = params.status ?? "";
  const search = (params.search ?? "").trim();

  const contractRows = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      ...(search ? {
        OR: [
          { contractNo:  { contains: search, mode: "insensitive" as const } },
          { soNo:        { contains: search, mode: "insensitive" as const } },
          { poNo:        { contains: search, mode: "insensitive" as const } },
          { serviceDesc: { contains: search, mode: "insensitive" as const } },
          { customer:    { companyName: { contains: search, mode: "insensitive" as const } } },
          { site:        { siteName: { contains: search, mode: "insensitive" as const } } },
          { vendor:      { name: { contains: search, mode: "insensitive" as const } } },
          { items:       { some: {
            OR: [
              { serialNumber: { contains: search, mode: "insensitive" as const } },
              { partNumber:   { contains: search, mode: "insensitive" as const } },
              { description:  { contains: search, mode: "insensitive" as const } },
            ],
          } } },
        ],
      } : {}),
    },
    orderBy: buildOrderBy(col, order),
    include: {
      customer: { select: { companyName: true } },
      _count:   { select: { items: true } },
    },
  });

  const countMap: Record<string, number> = {};
  contractRows.forEach((contract) => {
    const effectiveStatus = effectiveContractStatus(contract.status, contract.endDate);
    countMap[effectiveStatus] = (countMap[effectiveStatus] ?? 0) + 1;
  });
  const contracts = status
    ? contractRows.filter((contract) => effectiveContractStatus(contract.status, contract.endDate) === status)
    : contractRows;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>&larr; Dashboard</Link>
          <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "24px" }}>Contract Management</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            {contracts.length} contracts{search ? ` matching "${search}"` : ""}
          </p>
        </div>
        <Link href="/contracts/new" style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", textDecoration: "none" }}>
          + New Contract
        </Link>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { label: "All",            value: "" },
          { label: "ACTIVE",         value: "ACTIVE" },
          { label: "EXPIRED",        value: "EXPIRED" },
          { label: "PENDING RENEWAL",value: "PENDING_RENEWAL" },
          { label: "DRAFT",          value: "DRAFT" },
        ].map((tab) => {
          const active = status === tab.value;
          const cnt = tab.value === "" ? contracts.length : (countMap[tab.value] ?? 0);
          const href = `/contracts?sort=${col}&order=${order}${tab.value ? `&status=${tab.value}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
          return (
            <Link key={tab.value} href={href} style={{
              padding: "6px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: 600,
              textDecoration: "none",
              backgroundColor: active ? "#1E3A5F" : "white",
              color: active ? "white" : "#6b7280",
              border: `1px solid ${active ? "#1E3A5F" : "#e2e8f0"}`,
            }}>
              {tab.label}{tab.value !== "" && <span style={{ opacity: .7, fontSize: "11px" }}> ({cnt})</span>}
            </Link>
          );
        })}
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
              {[
                { label: "Contract No", key: "contractNo" },
                { label: "Customer",    key: "customer" },
                { label: "Project Name",key: null },
                { label: "SLA",         key: "slaType" },
                { label: "Start",       key: "startDate" },
                { label: "End",         key: "endDate" },
                { label: "Days Left",   key: null },
                { label: "Items",       key: null },
                { label: "Status",      key: "status" },
              ].map(({ label, key }) => {
                if (!key) {
                  return (
                    <th key={label} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {label}
                    </th>
                  );
                }
                const isActive = col === key;
                const nextOrder = isActive && order === "asc" ? "desc" : "asc";
                const arrow = isActive ? (order === "asc" ? " ↑" : " ↓") : " ↕";
                const href = `/contracts?sort=${key}&order=${nextOrder}${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
                return (
                  <th key={label} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                    <Link href={href} style={{ color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", opacity: isActive ? 1 : 0.85 }}>
                      {label}
                      <span style={{ fontSize: "12px", opacity: isActive ? 1 : 0.5 }}>{arrow}</span>
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
              const displayStatus = effectiveContractStatus(c.status, c.endDate);
              const projectName = c.serviceDesc?.trim() || "—";
              return (
                <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "monospace" }}>
                    <Link href={`/contracts/${c.id}`} style={{ color: "#2563EB", textDecoration: "none" }}>
                      {c.contractNo}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.customer.companyName}</td>
                  <td style={{ padding: "12px 16px", color: "#334155", fontSize: "13px", maxWidth: "260px" }}>
                    <span title={projectName} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {projectName}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px" }}>{c.slaType.replace(/_/g, " ")}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px" }}>{c.startDate.toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px" }}>{c.endDate.toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: dayColor, fontWeight: "bold", fontSize: "13px" }}>
                      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{c._count.items}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ backgroundColor: STATUS_COLOR[displayStatus] + "20", color: STATUS_COLOR[displayStatus], padding: "2px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "bold" }}>
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
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
