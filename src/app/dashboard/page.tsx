import prisma from "@/lib/prisma";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // ── Real stats from DB ────────────────────────────────────────────────────
  const [activeContracts, totalAssets, totalCustomers, expiringAssets, expiringContracts] =
    await Promise.all([
      prisma.contract.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({
        where: {
          deletedAt: null,
          warrantyEnd: {
            gte: new Date(),
            lte: new Date(Date.now() + 90 * 86400000),
          },
        },
      }),
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

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    {
      label: "Active Contracts",
      sublabel: "สัญญาที่ใช้งานอยู่",
      value: activeContracts,
      icon: "📄",
      gradient: "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
      glow: "rgba(59,130,246,0.35)",
      href: "/contracts",
    },
    {
      label: "Total Assets",
      sublabel: "อุปกรณ์ทั้งหมด",
      value: totalAssets,
      icon: "🖥️",
      gradient: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)",
      glow: "rgba(167,139,250,0.35)",
      href: "/assets",
    },
    {
      label: "Customers",
      sublabel: "ลูกค้าที่ดูแลอยู่",
      value: totalCustomers,
      icon: "🏢",
      gradient: "linear-gradient(135deg, #059669 0%, #34D399 100%)",
      glow: "rgba(52,211,153,0.35)",
      href: "/customers",
    },
    {
      label: "Expiring Soon",
      sublabel: "ใกล้หมดอายุ (90 วัน)",
      value: expiringAssets,
      icon: "⚠️",
      gradient: "linear-gradient(135deg, #D97706 0%, #FBBF24 100%)",
      glow: "rgba(251,191,36,0.35)",
      href: "/assets",
    },
  ];

  const modules = [
    { name: "Import Data", desc: "นำเข้าข้อมูลจาก Excel", href: "/import", icon: "📥", color: "#2563EB" },
    { name: "Global Search", desc: "ค้นหาด้วย Serial / ชื่อลูกค้า", href: "/search", icon: "🔍", color: "#7C3AED" },
    { name: "Customers", desc: "จัดการข้อมูลลูกค้า", href: "/customers", icon: "🏢", color: "#059669" },
    { name: "Contracts", desc: "สัญญาบำรุงรักษา", href: "/contracts", icon: "📄", color: "#1D4ED8" },
    { name: "Assets", desc: "ติดตามอุปกรณ์ IT", href: "/assets", icon: "🖥️", color: "#DC2626" },
    { name: "Licenses", desc: "จัดการ Software License", href: "/licenses", icon: "🔑", color: "#D97706" },
    { name: "Reports", desc: "ออกรายงาน Excel", href: "/api/reports/contracts?format=xlsx", icon: "📊", color: "#0891B2" },
    { name: "Health Check", desc: "ตรวจสอบสถานะระบบ", href: "/api/health", icon: "💚", color: "#16A34A" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0F172A; }

        .db-root {
          min-height: 100vh;
          background: linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #0F172A 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #E2E8F0;
        }

        /* ── TOP NAV ── */
        .topnav {
          background: rgba(15,23,42,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 0 40px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .topnav-left { display: flex; align-items: center; gap: 16px; }
        .nav-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.12); }
        .nav-title { font-size: 18px; font-weight: 700; color: #F8FAFC; letter-spacing: -0.3px; }
        .nav-subtitle { font-size: 12px; color: #94A3B8; margin-top: 1px; }
        .topnav-right { display: flex; align-items: center; gap: 20px; }

        .badge-live {
          display: flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,0.15); color: #34D399;
          border: 1px solid rgba(52,211,153,0.3);
          padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600;
        }
        .badge-live .dot {
          width: 7px; height: 7px; border-radius: 50%; background: #34D399;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.3); }
        }

        .avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #D41E28, #ef4444);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px; color: white;
          box-shadow: 0 0 0 2px rgba(212,30,40,0.4);
        }

        /* ── MAIN CONTENT ── */
        .main { padding: 36px 40px 60px; max-width: 1400px; margin: 0 auto; }

        /* ── PAGE HEADER ── */
        .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 36px; }
        .page-header-title { font-size: 30px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.5px; }
        .page-header-date { font-size: 13px; color: #64748B; margin-top: 4px; }

        /* ── ALERT BANNER ── */
        .alert-banner {
          background: linear-gradient(90deg, rgba(217,119,6,0.2) 0%, rgba(251,191,36,0.1) 100%);
          border: 1px solid rgba(251,191,36,0.35);
          border-radius: 12px;
          padding: 14px 20px;
          display: flex; align-items: center; gap: 14px;
          margin-bottom: 28px;
        }
        .alert-icon { font-size: 22px; }
        .alert-text { font-size: 14px; color: #FCD34D; font-weight: 600; }
        .alert-text span { color: #FBBF24; font-size: 18px; font-weight: 800; }

        /* ── KPI CARDS ── */
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .kpi-card {
          border-radius: 20px;
          padding: 28px;
          background: rgba(30,41,59,0.7);
          border: 1px solid rgba(255,255,255,0.07);
          text-decoration: none;
          display: block;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .kpi-card:hover { transform: translateY(-4px); }
        .kpi-icon-wrap {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 20px;
        }
        .kpi-value {
          font-size: 48px; font-weight: 800; color: #F8FAFC;
          line-height: 1; letter-spacing: -2px; margin-bottom: 6px;
        }
        .kpi-label { font-size: 15px; font-weight: 600; color: #CBD5E1; margin-bottom: 2px; }
        .kpi-sublabel { font-size: 12px; color: #64748B; }
        .kpi-arrow {
          position: absolute; top: 24px; right: 24px;
          font-size: 20px; opacity: 0.4;
        }
        .kpi-glow {
          position: absolute; bottom: -30px; right: -30px;
          width: 120px; height: 120px; border-radius: 50%;
          opacity: 0.12; filter: blur(30px);
        }

        /* ── BOTTOM GRID ── */
        .bottom-grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }

        /* ── MODULES ── */
        .section-card {
          background: rgba(30,41,59,0.6);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 28px;
        }
        .section-title {
          font-size: 18px; font-weight: 700; color: #F1F5F9;
          margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
        }
        .section-title-badge {
          background: rgba(212,30,40,0.2); color: #F87171;
          border: 1px solid rgba(248,113,113,0.3);
          padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
        }

        .modules-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .module-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 12px;
          background: rgba(15,23,42,0.5);
          border: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .module-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.15);
          transform: translateX(3px);
        }
        .module-icon-wrap {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .module-name { font-size: 14px; font-weight: 600; color: #E2E8F0; }
        .module-desc { font-size: 11px; color: #64748B; margin-top: 1px; }

        /* ── SIDEBAR CARDS ── */
        .sidebar-cards { display: flex; flex-direction: column; gap: 20px; }

        /* ── SEARCH ── */
        .search-wrap { position: relative; margin-bottom: 20px; }
        .search-input {
          width: 100%; padding: 14px 50px 14px 48px;
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: #E2E8F0; font-size: 14px;
          outline: none; transition: border-color 0.2s;
          font-family: inherit;
        }
        .search-input::placeholder { color: #475569; }
        .search-input:focus { border-color: rgba(212,30,40,0.5); }
        .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; }
        .search-btn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: linear-gradient(135deg, #D41E28, #ef4444);
          color: white; border: none; padding: 8px 18px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
        }

        /* ── STATUS CARD ── */
        .status-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .status-item:last-child { border-bottom: none; padding-bottom: 0; }
        .status-label { font-size: 13px; color: #94A3B8; }
        .status-val { font-size: 13px; font-weight: 700; }

        /* ── ACCOUNTS TABLE ── */
        .acc-row { display: grid; grid-template-columns: 100px 1fr; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .acc-row:last-child { border-bottom: none; }
        .role-badge { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-align: center; width: fit-content; }
        .acc-email { font-size: 12px; color: #64748B; font-family: monospace; }

        /* ── FOOTER ── */
        .db-footer { text-align: center; margin-top: 48px; font-size: 12px; color: #334155; }

        @media (max-width: 1100px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .kpi-grid { grid-template-columns: 1fr; }
          .main { padding: 20px; }
          .topnav { padding: 0 20px; }
        }
      `}</style>

      <div className="db-root">
        {/* ─── TOP NAV ─── */}
        <nav className="topnav">
          <div className="topnav-left">
            <Image
              src="/itas-logo.png"
              alt="iTAS Solutions"
              width={100}
              height={42}
              style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
              priority
            />
            <div className="nav-divider" />
            <div>
              <div className="nav-title">BackOffice System</div>
              <div className="nav-subtitle">IT Asset &amp; Maintenance Contract Management</div>
            </div>
          </div>
          <div className="topnav-right">
            <div className="badge-live">
              <div className="dot" />
              LIVE
            </div>
            <div className="avatar">A</div>
          </div>
        </nav>

        {/* ─── MAIN ─── */}
        <main className="main">

          {/* Page Header */}
          <div className="page-header">
            <div>
              <div className="page-header-title">Dashboard Overview</div>
              <div className="page-header-date">{today}</div>
            </div>
          </div>

          {/* Alert Banner */}
          {expiringContracts > 0 && (
            <div className="alert-banner">
              <span className="alert-icon">⚠️</span>
              <p className="alert-text">
                มีสัญญา <span>{expiringContracts}</span> รายการที่จะหมดอายุภายใน 90 วัน — ควรติดต่อต่อสัญญาก่อนหมดอายุ
              </p>
              <a href="/contracts" style={{ marginLeft: "auto", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", color: "#FCD34D", padding: "6px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                ดูสัญญา →
              </a>
            </div>
          )}

          {/* ─── KPI CARDS ─── */}
          <div className="kpi-grid">
            {kpis.map((k) => (
              <a key={k.label} href={k.href} className="kpi-card" style={{ boxShadow: `0 8px 32px ${k.glow}` }}>
                <div className="kpi-glow" style={{ background: k.gradient }} />
                <div className="kpi-icon-wrap" style={{ background: k.gradient }}>
                  {k.icon}
                </div>
                <div className="kpi-value">{k.value.toLocaleString()}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-sublabel">{k.sublabel}</div>
                <div className="kpi-arrow">→</div>
              </a>
            ))}
          </div>

          {/* ─── BOTTOM GRID ─── */}
          <div className="bottom-grid">

            {/* Left: Search + Modules */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Search */}
              <div className="section-card">
                <div className="section-title">🔍 Global Search</div>
                <form method="GET" action="/search">
                  <div className="search-wrap">
                    <span className="search-icon">🔎</span>
                    <input
                      name="q"
                      className="search-input"
                      placeholder="ค้นหา Serial Number, ชื่อลูกค้า, Part No., Asset Code..."
                    />
                    <button type="submit" className="search-btn">ค้นหา</button>
                  </div>
                  <p style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>
                    ค้นหาข้ามทุก module — แสดงวันหมดประกัน, สถานะสัญญา, วิศวกรผู้รับผิดชอบ
                  </p>
                </form>
              </div>

              {/* Modules */}
              <div className="section-card">
                <div className="section-title">
                  ⚡ System Modules
                  <span className="section-title-badge">8 modules</span>
                </div>
                <div className="modules-grid">
                  {modules.map((m) => (
                    <a key={m.name} href={m.href} className="module-card">
                      <div className="module-icon-wrap" style={{ background: m.color + "22" }}>
                        {m.icon}
                      </div>
                      <div>
                        <div className="module-name">{m.name}</div>
                        <div className="module-desc">{m.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="sidebar-cards">

              {/* System Status */}
              <div className="section-card">
                <div className="section-title">📡 System Status</div>
                <div>
                  {[
                    { label: "Database",       val: "● Connected",  color: "#34D399" },
                    { label: "Active Contracts", val: `${activeContracts} รายการ`, color: "#93C5FD" },
                    { label: "Total Assets",   val: `${totalAssets} รายการ`, color: "#C4B5FD" },
                    { label: "Customers",      val: `${totalCustomers} ราย`, color: "#6EE7B7" },
                    { label: "Expiring (90d)", val: `${expiringAssets} รายการ`, color: expiringAssets > 0 ? "#FCD34D" : "#6EE7B7" },
                  ].map((s) => (
                    <div key={s.label} className="status-item">
                      <span className="status-label">{s.label}</span>
                      <span className="status-val" style={{ color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Login Accounts */}
              <div className="section-card">
                <div className="section-title">👤 Login Accounts</div>
                <div>
                  {[
                    { role: "Admin",    email: "admin@itas.co.th",    bg: "#EF4444", text: "#FCA5A5" },
                    { role: "Sale",     email: "sale@itas.co.th",     bg: "#3B82F6", text: "#93C5FD" },
                    { role: "Engineer", email: "engineer@itas.co.th", bg: "#10B981", text: "#6EE7B7" },
                    { role: "Viewer",   email: "viewer@itas.co.th",   bg: "#6B7280", text: "#D1D5DB" },
                  ].map((u) => (
                    <div key={u.role} className="acc-row">
                      <span className="role-badge" style={{ background: u.bg + "25", color: u.text, border: `1px solid ${u.bg}40` }}>
                        {u.role}
                      </span>
                      <span className="acc-email">{u.email}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "#334155", marginTop: "14px" }}>
                  * Password: ดูในเอกสาร System Guide
                </p>
              </div>

              {/* Quick Actions */}
              <div className="section-card">
                <div className="section-title">🚀 Quick Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <a href="/import" style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
                    color: "white", padding: "12px 18px", borderRadius: "10px",
                    textDecoration: "none", fontSize: "14px", fontWeight: 600,
                    boxShadow: "0 4px 14px rgba(37,99,235,0.4)"
                  }}>
                    📥 Import ข้อมูลจาก Excel
                  </a>
                  <a href="/contracts" style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#CBD5E1", padding: "12px 18px", borderRadius: "10px",
                    textDecoration: "none", fontSize: "14px", fontWeight: 600,
                  }}>
                    📄 ดูรายการสัญญาทั้งหมด
                  </a>
                  <a href="/assets" style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#CBD5E1", padding: "12px 18px", borderRadius: "10px",
                    textDecoration: "none", fontSize: "14px", fontWeight: 600,
                  }}>
                    🖥️ ติดตามอุปกรณ์ IT
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="db-footer">
            iTAS BackOffice System — IT Asset &amp; Maintenance Contract Management &nbsp;·&nbsp; Powered by iTAS Solutions
          </div>
        </main>
      </div>
    </>
  );
}
