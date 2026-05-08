import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import MoveCustomerButton from "./MoveCustomerButton";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981", DRAFT: "#6b7280", EXPIRED: "#ef4444",
  CANCELLED: "#9ca3af", PENDING_RENEWAL: "#f59e0b",
};

function daysLeft(end: Date) {
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      contracts: {
        where: { deletedAt: null },
        orderBy: { contractNo: "desc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });

  if (!customer) notFound();

  const activeCount  = customer.contracts.filter(c => c.status === "ACTIVE").length;
  const expiredCount = customer.contracts.filter(c => c.status === "EXPIRED").length;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* Back */}
      <div style={{ marginBottom: "20px" }}>
        <Link href="/customers" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>
          &larr; Customer Management
        </Link>
      </div>

      {/* Customer header card */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "28px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 6px", color: "#1E3A5F", fontSize: "26px", fontWeight: 800 }}>
              {customer.companyName}
            </h1>
            {customer.shortName && (
              <span style={{ fontSize: "13px", color: "#6b7280", backgroundColor: "#f1f5f9", padding: "2px 10px", borderRadius: "99px" }}>
                {customer.shortName}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#10b98120", color: "#10b981", padding: "4px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: 700 }}>
              {customer.status}
            </span>
            <MoveCustomerButton sourceId={customer.id} sourceName={customer.companyName} />
            <Link href={`/customers/${customer.id}/edit`} style={{ backgroundColor: "#f1f5f9", color: "#1E3A5F", border: "1px solid #e2e8f0", padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
              Edit
            </Link>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
          {[
            { label: "Contact Person", value: customer.contactPerson ?? "—" },
            { label: "Phone",          value: customer.contactPhone  ?? "—" },
            { label: "Email",          value: customer.contactEmail  ?? "—" },
            { label: "Tax ID",         value: customer.taxId         ?? "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Address */}
        {customer.address && (
          <div style={{ marginTop: "16px", fontSize: "13px", color: "#6b7280" }}>
            {customer.address}
          </div>
        )}

        {/* Summary badges */}
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}>
            {customer.contracts.length} contracts total
          </div>
          <div style={{ backgroundColor: "#ecfdf5", color: "#10b981", padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}>
            {activeCount} active
          </div>
          {expiredCount > 0 && (
            <div style={{ backgroundColor: "#fef2f2", color: "#ef4444", padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}>
              {expiredCount} expired
            </div>
          )}
        </div>
      </div>

      {/* Contracts table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Contracts</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>{customer.contracts.length} รายการ</span>
            <Link
              href={`/contracts/new?customerId=${customer.id}`}
              style={{ backgroundColor: "#1E3A5F", color: "white", padding: "7px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}
            >
              + Add Contract
            </Link>
          </div>
        </div>

        {customer.contracts.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: "14px", marginBottom: "12px" }}>ยังไม่มี Contract สำหรับลูกค้านี้</div>
            <Link
              href={`/contracts/new?customerId=${customer.id}`}
              style={{ backgroundColor: "#1E3A5F", color: "white", padding: "10px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}
            >
              + สร้าง Contract แรก
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Contract No", "Service", "SLA", "Start", "End", "Days Left", "Items", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customer.contracts.map((c, i) => {
                const days = daysLeft(c.endDate);
                const dayColor = days < 0 ? "#ef4444" : days <= 30 ? "#f97316" : days <= 90 ? "#f59e0b" : "#10b981";
                return (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "monospace" }}>
                      <Link href={`/contracts/${c.id}?from=/customers/${customer.id}`} style={{ color: "#2563EB", textDecoration: "none" }}>
                        {c.contractNo}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#475569", maxWidth: "200px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.serviceDesc ?? "—"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#475569" }}>
                      {c.slaType.replace(/_/g, " ")}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                      {c.startDate.toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                      {c.endDate.toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: dayColor, fontWeight: "bold", fontSize: "13px" }}>
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {c._count.items}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ backgroundColor: STATUS_COLOR[c.status] + "20", color: STATUS_COLOR[c.status], padding: "2px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "bold" }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
