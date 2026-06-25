import AppShell from "@/components/layout/AppShell";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export default async function DashboardPage() {
  const now = new Date();
  const in90 = new Date(Date.now() + 90 * 86400000);

  const [activeContracts, totalAssets, totalCustomers, expiringAssets, expiringContractsList] =
    await Promise.all([
      prisma.contract.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null, warrantyEnd: { gte: now, lte: in90 } } }),
      prisma.contract.findMany({
        where: { deletedAt: null, status: "ACTIVE", endDate: { gte: now, lte: in90 } },
        orderBy: { endDate: "asc" },
        include: { customer: { select: { companyName: true } } },
      }),
    ]);

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    {
      label: "Active Contracts",
      value: activeContracts,
      sub: "Active maintenance contracts",
      tone: "blue",
      href: "/contracts",
      icon: "DOC",
      change: "+2 this month",
    },
    {
      label: "Total Assets",
      value: totalAssets,
      sub: "Tracked IT assets",
      tone: "violet",
      href: "/assets",
      icon: "IT",
      change: "+12 this month",
    },
    {
      label: "Customers",
      value: totalCustomers,
      sub: "Active customers",
      tone: "green",
      href: "/customers",
      icon: "CRM",
      change: "+1 this month",
    },
    {
      label: "Expiring 90d",
      value: expiringAssets,
      sub: "Warranties expiring soon",
      tone: "amber",
      href: "/assets",
      icon: "!",
      change: expiringAssets > 0 ? "Needs action" : "Healthy",
    },
  ];

  const quickLinks = [
    { label: "Import from Excel", desc: "Upload certification data", href: "/import", icon: "IN" },
    { label: "Search Serial / Asset", desc: "Search across modules", href: "/search", icon: "GO" },
    { label: "All Contracts", desc: `${activeContracts} active`, href: "/contracts", icon: "MA" },
    { label: "IT Assets", desc: `${totalAssets} items`, href: "/assets", icon: "IT" },
    { label: "Customer Data", desc: `${totalCustomers} customers`, href: "/customers", icon: "CU" },
    {
      label: "Export Report",
      desc: "Download Excel report",
      href: "/api/reports/contracts?format=xlsx",
      icon: "XL",
    },
  ];

  const css = `
    .dash-page{padding:28px 32px 48px}
    .dash-title{font-size:26px;font-weight:850;color:#0F172A;letter-spacing:-.4px}
    .dash-date{margin-top:4px;margin-bottom:24px;color:#94A3B8;font-size:13px}
    .dash-alert{display:flex;align-items:center;gap:14px;margin-bottom:24px;padding:14px 18px;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:10px;background:#FFFBEB}
    .dash-alert-icon{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:#FEF3C7;color:#B45309;font-weight:900}
    .dash-alert-title{color:#92400E;font-size:14px;font-weight:750}
    .dash-alert-sub{margin-top:2px;color:#B45309;font-size:12px}
    .dash-alert-link{margin-left:auto;padding:8px 16px;border-radius:7px;background:#F59E0B;color:white;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap}
    .dash-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:22px}
    .dash-kpi{position:relative;display:block;overflow:hidden;min-height:154px;padding:22px 24px;border:1.5px solid #E2E8F0;border-radius:14px;background:white;text-decoration:none;transition:border-color .15s,box-shadow .15s,transform .15s}
    .dash-kpi:hover{transform:translateY(-2px);border-color:#CBD5E1;box-shadow:0 8px 24px rgba(15,23,42,.08)}
    .dash-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
    .dash-kpi-icon{display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;font-size:12px;font-weight:900;letter-spacing:.02em}
    .dash-change{padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800}
    .dash-kpi-value{margin-bottom:4px;font-size:42px;font-weight:900;line-height:1;letter-spacing:-1.6px}
    .dash-kpi-label{color:#475569;font-size:14px;font-weight:750}
    .dash-kpi-sub{margin-top:2px;color:#94A3B8;font-size:12px}
    .dash-kpi::after{content:"";position:absolute;inset:auto 0 0;height:3px;background:currentColor;opacity:.18}
    .dash-kpi.blue{color:#2563EB}.dash-kpi.violet{color:#7C3AED}.dash-kpi.green{color:#059669}.dash-kpi.amber{color:#D97706}
    .dash-kpi.blue .dash-kpi-icon,.dash-kpi.blue .dash-change{background:#EFF6FF}
    .dash-kpi.violet .dash-kpi-icon,.dash-kpi.violet .dash-change{background:#F5F3FF}
    .dash-kpi.green .dash-kpi-icon,.dash-kpi.green .dash-change{background:#ECFDF5}
    .dash-kpi.amber .dash-kpi-icon,.dash-kpi.amber .dash-change{background:#FFFBEB}
    .dash-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:22px}
    .dash-card{padding:24px;border:1.5px solid #E2E8F0;border-radius:14px;background:white}
    .dash-card-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;color:#0F172A;font-size:18px;font-weight:800}
    .dash-badge{padding:2px 10px;border-radius:999px;background:#F1F5F9;color:#64748B;font-size:12px;font-weight:800}
    .dash-quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .dash-quick-item{display:flex;align-items:center;gap:14px;min-height:74px;padding:16px;border:1.5px solid #F1F5F9;border-radius:10px;background:#FAFAFA;text-decoration:none;transition:border-color .15s,background .15s,transform .15s}
    .dash-quick-item:hover{transform:translateX(2px);border-color:#CBD5E1;background:white}
    .dash-quick-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:0 0 44px;border-radius:10px;background:#EFF6FF;color:#1D4ED8;font-size:12px;font-weight:900}
    .dash-quick-name{display:block;color:#1E293B;font-size:15px;font-weight:800}
    .dash-quick-desc{display:block;margin-top:2px;color:#94A3B8;font-size:13px}
    .dash-status-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid #F1F5F9}
    .dash-status-row:last-child{border-bottom:0;padding-bottom:0}
    .dash-status-left{display:flex;align-items:center;gap:10px;color:#475569;font-size:13px}
    .dash-dot{width:8px;height:8px;border-radius:999px;background:#10B981}
    .dash-status-value{font-size:13px;font-weight:850}
    .dash-footer{margin-top:34px;text-align:center;color:#CBD5E1;font-size:12px}
    @media(max-width:1180px){.dash-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-layout{grid-template-columns:1fr}}
    @media(max-width:720px){.dash-page{padding:20px}.dash-grid,.dash-quick{grid-template-columns:1fr}.dash-alert{align-items:flex-start}.dash-alert-link{display:none}}
  `;

  return (
    <AppShell>
      <style>{css}</style>
      <div className="dash-page">
        <div className="dash-title">Dashboard Overview</div>
        <div className="dash-date">{today}</div>

        {expiringContractsList.length > 0 && (
          <div className="dash-alert">
            <div className="dash-alert-icon">!</div>
            <div>
              <div className="dash-alert-title">
                {expiringContractsList.length} contracts expire within 90 days
              </div>
              <div className="dash-alert-sub">
                Nearest: {expiringContractsList[0].contractNo} -{" "}
                {expiringContractsList[0].customer.companyName} in{" "}
                {daysUntil(expiringContractsList[0].endDate)} days
              </div>
            </div>
            <Link href="/contracts?sort=endDate&order=asc&status=ACTIVE" className="dash-alert-link">
              View all
            </Link>
          </div>
        )}

        <div className="dash-grid">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className={`dash-kpi ${kpi.tone}`}>
              <div className="dash-kpi-top">
                <div className="dash-kpi-icon">{kpi.icon}</div>
                <span className="dash-change">{kpi.change}</span>
              </div>
              <div className="dash-kpi-value">{kpi.value.toLocaleString()}</div>
              <div className="dash-kpi-label">{kpi.label}</div>
              <div className="dash-kpi-sub">{kpi.sub}</div>
            </Link>
          ))}
        </div>

        <div className="dash-layout">
          <section className="dash-card">
            <div className="dash-card-title">
              Quick Access
              <span className="dash-badge">6 modules</span>
            </div>
            <div className="dash-quick">
              {quickLinks.map((link) => (
                <Link key={link.label} href={link.href} className="dash-quick-item">
                  <span className="dash-quick-icon">{link.icon}</span>
                  <span>
                    <span className="dash-quick-name">{link.label}</span>
                    <span className="dash-quick-desc">{link.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-title">System Status</div>
            {[
              { key: "Database", value: "Connected", color: "#059669" },
              { key: "Active Contracts", value: `${activeContracts} items`, color: "#2563EB" },
              { key: "Total Assets", value: `${totalAssets} items`, color: "#7C3AED" },
              { key: "Customers", value: `${totalCustomers} items`, color: "#059669" },
              { key: "Expiring Assets", value: `${expiringAssets} items`, color: "#D97706" },
              { key: "Contracts Expiring", value: `${expiringContractsList.length} items`, color: "#DC2626" },
            ].map((item) => (
              <div key={item.key} className="dash-status-row">
                <div className="dash-status-left">
                  <span className="dash-dot" style={{ background: item.color }} />
                  {item.key}
                </div>
                <div className="dash-status-value" style={{ color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="dash-footer">
          iTAS BackOffice System - IT Asset and Maintenance Contract Management - 2026 iTAS Solutions
        </div>
      </div>
    </AppShell>
  );
}
