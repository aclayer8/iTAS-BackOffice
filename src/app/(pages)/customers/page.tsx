import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981", INACTIVE: "#6b7280", PROSPECT: "#f59e0b", BLACKLISTED: "#ef4444",
};

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { companyName: "asc" },
    include: { _count: { select: { sites: true, contracts: true, assets: true } } },
  });

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "14px" }}>&larr; Dashboard</Link>
          <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "24px" }}>Customer Management</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>{customers.length} customers in system</p>
        </div>
        <button style={{ backgroundColor: "#1E3A5F", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
          + New Customer
        </button>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
              {["Company Name", "Short Name", "Tax ID", "Contact", "Status", "Sites", "Contracts", "Assets"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                  <Link href={`/customers/${c.id}`} style={{ color: "#1E3A5F", textDecoration: "none" }}>
                    {c.companyName}
                  </Link>
                </td>
                <td style={{ padding: "12px 16px", color: "#6b7280" }}>{c.shortName ?? "—"}</td>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px" }}>{c.taxId ?? "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: "13px" }}>{c.contactPerson ?? "—"}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>{c.contactPhone ?? ""}</div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ backgroundColor: STATUS_COLOR[c.status] + "20", color: STATUS_COLOR[c.status], padding: "2px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "bold" }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>{c._count.sites}</td>
                <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: c._count.contracts > 0 ? "#2563EB" : "#6b7280" }}>
                  {c._count.contracts > 0
                    ? <Link href={`/customers/${c.id}`} style={{ color: "#2563EB", textDecoration: "none" }}>{c._count.contracts}</Link>
                    : 0}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>{c._count.assets}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
