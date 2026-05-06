import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // ── Query real stats from DB ──────────────────────────────────────────────
  const [activeContracts, totalAssets, totalCustomers, expiringAssets, expiringContracts] =
    await Promise.all([
      prisma.contract.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { status: "ACTIVE", deletedAt: null } }),
      // Assets with warranty expiring within 90 days
      prisma.asset.count({
        where: {
          deletedAt: null,
          warrantyEnd: {
            gte: new Date(),
            lte: new Date(Date.now() + 90 * 86400000),
          },
        },
      }),
      // Contracts expiring within 90 days
      prisma.contract.count({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 90 * 86400000),
          },
        },
      }),
    ]);

  const stats = [
    { label: "Active Contracts",    value: activeContracts,   color: "#2563EB", icon: "📄", href: "/contracts" },
    { label: "Total Assets",        value: totalAssets,       color: "#7C3AED", icon: "🖥️", href: "/assets" },
    { label: "Customers",           value: totalCustomers,    color: "#059669", icon: "🏢", href: "/customers" },
    { label: "ใกล้หมดประกัน (90d)", value: expiringAssets,   color: "#D97706", icon: "⚠️", href: "/assets" },
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "40px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ backgroundColor: "#1E3A5F", color: "white", padding: "20px 32px", borderRadius: "12px", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>🖥️ iTAS BackOffice System</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: "14px" }}>IT Asset &amp; Maintenance Contract Management</p>
      </div>

      {/* Search Bar */}
      <form method="GET" action="/search" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            name="q"
            placeholder="🔍  ค้นหาด้วย Serial Number, ชื่อลูกค้า, Part No., Asset Code..."
            style={{
              flex: 1, padding: "14px 20px", borderRadius: "12px",
              border: "2px solid #e2e8f0", fontSize: "15px",
              outline: "none", fontFamily: "Arial, sans-serif",
              boxShadow: "0 1px 4px rgba(0,0,0,.08)",
            }}
          />
          <button type="submit" style={{
            backgroundColor: "#2563EB", color: "white", border: "none",
            padding: "14px 32px", borderRadius: "12px", cursor: "pointer",
            fontSize: "15px", fontWeight: "bold", whiteSpace: "nowrap",
          }}>
            ค้นหา
          </button>
        </div>
        <p style={{ margin: "6px 0 0 4px", fontSize: "12px", color: "#9ca3af" }}>
          ค้นหาข้ามทุก module — แสดงวันหมดประกัน, สถานะสัญญา, วิศวกรผู้รับผิดชอบ
        </p>
      </form>

      {/* Alert: expiring contracts */}
      {expiringContracts > 0 && (
        <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <p style={{ margin: 0, color: "#92400e", fontWeight: "bold", fontSize: "14px" }}>
            มีสัญญา {expiringContracts} รายการที่จะหมดอายุภายใน 90 วัน — ควรติดต่อต่อสัญญา
          </p>
        </div>
      )}

      {/* Quick Stats — real data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {stats.map((stat) => (
          <a key={stat.label} href={stat.href} style={{ textDecoration: "none" }}>
            <div style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              borderTop: `4px solid ${stat.color}`,
              transition: "box-shadow .15s",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: stat.color }}>{stat.value.toLocaleString()}</div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{stat.label}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Modules */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 20px", color: "#1E3A5F", fontSize: "18px" }}>📋 Modules ที่พร้อมใช้งาน</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { name: "Import จาก Excel", api: "/import", icon: "📥" },
            { name: "ค้นหา (Serial / ลูกค้า)", api: "/search", icon: "🔍" },
            { name: "Customer Management", api: "/customers", icon: "🏢" },
            { name: "Contract Management", api: "/contracts", icon: "📄" },
            { name: "Asset Tracking", api: "/assets", icon: "🖥️" },
            { name: "License Management", api: "/licenses", icon: "🔑" },
            { name: "Notifications (API)", api: "/api/notifications", icon: "🔔" },
            { name: "Reports Excel", api: "/api/reports/contracts?format=xlsx", icon: "📈" },
            { name: "Health Check", api: "/api/health", icon: "💚" },
          ].map((mod) => (
            <a key={mod.name} href={mod.api} target="_self" style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 16px", backgroundColor: "#f8fafc",
              borderRadius: "8px", border: "1px solid #e2e8f0",
              textDecoration: "none", color: "#1E3A5F", fontSize: "14px",
            }}>
              <span style={{ fontSize: "20px" }}>{mod.icon}</span>
              <span style={{ fontWeight: 500 }}>{mod.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Login Accounts */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: "0 0 16px", color: "#1E3A5F", fontSize: "18px" }}>👤 Default Login Accounts</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Role</th>
              <th style={{ padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Email</th>
              <th style={{ padding: "10px 16px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Password</th>
            </tr>
          </thead>
          <tbody>
            {[
              { role: "Admin",    email: "admin@itas.co.th",    pass: "Admin@1234!", color: "#ef4444" },
              { role: "Sale",     email: "sale@itas.co.th",     pass: "Sale@1234!",  color: "#3b82f6" },
              { role: "Engineer", email: "engineer@itas.co.th", pass: "Eng@1234!",   color: "#10b981" },
              { role: "Viewer",   email: "viewer@itas.co.th",   pass: "View@1234!",  color: "#6b7280" },
            ].map((u) => (
              <tr key={u.role} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ backgroundColor: u.color + "20", color: u.color, padding: "2px 10px", borderRadius: "99px", fontWeight: "bold", fontSize: "12px" }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{u.email}</td>
                <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{u.pass}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
