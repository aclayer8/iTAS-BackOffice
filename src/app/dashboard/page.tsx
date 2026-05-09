import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as { id?: string; name?: string; email?: string; role?: string };
  const userName  = sessionUser.name  ?? "User";
  const userEmail = sessionUser.email ?? "";
  const userRole  = sessionUser.role  ?? "VIEWER";
  const userInitial = userName.charAt(0).toUpperCase();

  const now   = new Date();
  const in90  = new Date(Date.now() + 90 * 86400000);

  const [activeContracts, totalAssets, totalCustomers, expiringAssets, expiringContractsList] =
    await Promise.all([
      prisma.contract.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.asset.count({
        where: { deletedAt: null, warrantyEnd: { gte: now, lte: in90 } },
      }),
      prisma.contract.findMany({
        where: { deletedAt: null, status: "ACTIVE", endDate: { gte: now, lte: in90 } },
        orderBy: { endDate: "asc" },
        include: { customer: { select: { companyName: true } } },
      }),
    ]);

  const expiringContracts = expiringContractsList.length;

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const navItems = [
    { icon: "\u229E", label: "Dashboard",   href: "/dashboard", active: true  },
    { icon: "\uD83D\uDCC4", label: "Contracts",   href: "/contracts", active: false },
    { icon: "\uD83D\uDDA5\uFE0F",label: "Assets",      href: "/assets",    active: false },
    { icon: "\uD83C\uDFE2", label: "Customers",   href: "/customers", active: false },
    { icon: "\uD83D\uDCE5", label: "Import Data", href: "/import",    active: false },
    { icon: "\uD83D\uDD0D", label: "Search",      href: "/search",    active: false },
    { icon: "\uD83D\uDD11", label: "Licenses",    href: "/licenses",  active: false },
    { icon: "\uD83D\uDCCA", label: "Reports",     href: "/api/reports/contracts?format=xlsx", active: false },
  ];

  const kpis = [
    { label:"Active Contracts", value:activeContracts, sub:"\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E17\u0E35\u0E48 active",   icon:"\uD83D\uDCC4", color:"#2563EB", bg:"#EFF6FF", href:"/contracts", change:"+2 \u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49" },
    { label:"Total Assets",     value:totalAssets,     sub:"\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14",   icon:"\uD83D\uDDA5\uFE0F",color:"#7C3AED", bg:"#F5F3FF", href:"/assets",    change:"+12 \u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49" },
    { label:"Customers",        value:totalCustomers,  sub:"\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E17\u0E35\u0E48\u0E14\u0E39\u0E41\u0E25\u0E2D\u0E22\u0E39\u0E48",icon:"\uD83C\uDFE2", color:"#059669", bg:"#ECFDF5", href:"/customers", change:"+1 \u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49" },
    { label:"Expiring 90d",     value:expiringAssets,  sub:"\u0E43\u0E01\u0E25\u0E49\u0E2B\u0E21\u0E14\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19",    icon:"\u26A0\uFE0F", color: expiringAssets>0?"#D97706":"#059669", bg:expiringAssets>0?"#FFFBEB":"#ECFDF5", href:"/assets", change:expiringAssets>0?"\u0E15\u0E49\u0E2D\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23":"\u0E1B\u0E01\u0E15\u0E34\u0E14\u0E35" },
  ];

  const quickLinks = [
    { label:"Import \u0E08\u0E32\u0E01 Excel",    desc:"\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48",        href:"/import",    icon:"\uD83D\uDCE5", color:"#2563EB" },
    { label:"\u0E04\u0E49\u0E19\u0E2B\u0E32 Serial / Asset",desc:"\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E02\u0E49\u0E32\u0E21\u0E17\u0E38\u0E01 module",      href:"/search",    icon:"\uD83D\uDD0D", color:"#7C3AED" },
    { label:"\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14",        desc:`${activeContracts} active`,href:"/contracts", icon:"\uD83D\uDCC4", color:"#059669" },
    { label:"\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C IT",           desc:`${totalAssets} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`,   href:"/assets",    icon:"\uD83D\uDDA5\uFE0F",color:"#DC2626" },
    { label:"\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",         desc:`${totalCustomers} \u0E23\u0E32\u0E22`,   href:"/customers", icon:"\uD83C\uDFE2", color:"#0891B2" },
    { label:"Export \u0E23\u0E32\u0E22\u0E07\u0E32\u0E19",        desc:"\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14 Excel",         href:"/api/reports/contracts?format=xlsx", icon:"\uD83D\uDCCA", color:"#D97706" },
  ];

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;background:#F1F5F9;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif}
    .shell{display:flex;min-height:100vh;background:#F1F5F9}
    .sidebar{width:240px;flex-shrink:0;background:#0F172A;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:50;border-right:1px solid rgba(255,255,255,0.06)}
    .sidebar-logo{padding:20px 18px 16px;border-bottom:1px solid rgba(255,255,255,0.07)}
    .sidebar-logo-box{background:white;border-radius:10px;padding:8px 10px;display:inline-flex;align-items:center}
    .section-label{padding:20px 18px 8px;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#475569;text-transform:uppercase}
    .nav-item{display:flex;align-items:center;gap:10px;padding:9px 18px;margin:1px 8px;border-radius:8px;font-size:13.5px;font-weight:500;color:#94A3B8;text-decoration:none;transition:background .15s,color .15s}
    .nav-item:hover{background:rgba(255,255,255,0.06);color:#E2E8F0}
    .nav-item.active{background:rgba(212,30,40,0.15);color:#F87171}
    .nav-icon{width:20px;text-align:center;font-size:15px}
    .sidebar-footer{margin-top:auto;padding:16px 18px;border-top:1px solid rgba(255,255,255,0.07)}
    .sidebar-user{display:flex;align-items:center;gap:10px}
    .sidebar-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#D41E28,#ef4444);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;flex-shrink:0}
    .u-name{font-size:13px;font-weight:600;color:#E2E8F0}
    .u-role{font-size:11px;color:#64748B}
    .main-area{margin-left:240px;flex:1;display:flex;flex-direction:column;min-height:100vh}
    .topbar{background:white;border-bottom:1px solid #E2E8F0;height:64px;padding:0 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
    .bc{font-size:13px;color:#94A3B8}
    .bc-cur{font-size:14px;font-weight:600;color:#1E293B}
    .tsearch{display:flex;align-items:center;gap:8px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:8px 16px;min-width:320px;transition:border-color .15s}
    .tsearch:focus-within{border-color:#D41E28}
    .tsearch input{background:none;border:none;outline:none;font-size:13.5px;color:#1E293B;width:100%;font-family:inherit}
    .tsearch input::placeholder{color:#94A3B8}
    .topbar-right{display:flex;align-items:center;gap:12px}
    .live-badge{display:flex;align-items:center;gap:6px;background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;padding:5px 12px;border-radius:99px;font-size:12px;font-weight:600}
    .live-dot{width:6px;height:6px;border-radius:50%;background:#10B981;animation:blink 2s infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
    .top-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#D41E28,#ef4444);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(212,30,40,0.35)}
    .content{padding:28px 32px 48px}
    .page-title{font-size:26px;font-weight:800;color:#0F172A;letter-spacing:-.5px}
    .page-date{font-size:13px;color:#94A3B8;margin-top:3px;margin-bottom:28px}
    .alert{display:flex;align-items:center;gap:12px;background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:10px;padding:14px 18px;margin-bottom:24px}
    .alert-title{font-size:14px;font-weight:600;color:#92400E}
    .alert-sub{font-size:12px;color:#B45309;margin-top:1px}
    .alert-btn{background:#F59E0B;color:white;border:none;padding:7px 16px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:26px}
    .kpi-card{background:white;border:1.5px solid #E2E8F0;border-radius:14px;padding:22px 24px;text-decoration:none;display:block;position:relative;overflow:hidden;transition:box-shadow .2s,transform .2s,border-color .2s}
    .kpi-card:hover{box-shadow:0 8px 24px rgba(0,0,0,0.08);transform:translateY(-2px);border-color:#CBD5E1}
    .kpi-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
    .kpi-icon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
    .kpi-change{font-size:11px;font-weight:600;padding:3px 8px;border-radius:99px}
    .kpi-value{font-size:42px;font-weight:800;line-height:1;letter-spacing:-2px;margin-bottom:4px}
    .kpi-label{font-size:14px;font-weight:600;color:#475569;margin-bottom:2px}
    .kpi-sub{font-size:12px;color:#94A3B8}
    .kpi-bar{position:absolute;bottom:0;left:0;right:0;height:3px}
    .two-col{display:grid;grid-template-columns:1fr 360px;gap:22px}
    .card{background:white;border:1.5px solid #E2E8F0;border-radius:14px;padding:24px}
    .card-title{font-size:18px;font-weight:700;color:#0F172A;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
    .card-badge{font-size:13px;font-weight:600;padding:2px 10px;border-radius:99px;background:#F1F5F9;color:#64748B}
    .ql-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .ql-item{display:flex;align-items:center;gap:14px;padding:16px 16px;border-radius:10px;border:1.5px solid #F1F5F9;background:#FAFAFA;text-decoration:none;transition:border-color .15s,background .15s,transform .15s}
    .ql-item:hover{border-color:#CBD5E1;background:white;transform:translateX(2px);box-shadow:0 2px 8px rgba(0,0,0,0.05)}
    .ql-icon{width:46px;height:46px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
    .ql-name{font-size:16px;font-weight:600;color:#1E293B}
    .ql-desc{font-size:13px;color:#94A3B8;margin-top:2px}
    .status-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid #F1F5F9}
    .status-row:last-child{border-bottom:none;padding-bottom:0}
    .s-left{display:flex;align-items:center;gap:10px}
    .s-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .s-key{font-size:13px;color:#475569}
    .s-val{font-size:13px;font-weight:700}
    .page-footer{text-align:center;margin-top:36px;font-size:12px;color:#CBD5E1;padding-bottom:12px}
    @media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.two-col{grid-template-columns:1fr}}
    @media(max-width:768px){.sidebar{width:200px}.main-area{margin-left:200px}.tsearch{display:none}.content{padding:20px}}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-box">
              <Image src="/itas-logo.png" alt="iTAS Solutions" width={120} height={44} style={{objectFit:"contain",display:"block"}} priority />
            </div>
          </div>
          <div className="section-label">Main Menu</div>
          <nav>
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className={"nav-item" + (item.active ? " active" : "")}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{userInitial}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="u-name" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName}</div>
                <div className="u-role" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userRole}</div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="bc">iTAS BackOffice / </span>
              <span className="bc-cur">Dashboard</span>
            </div>
            <form method="GET" action="/search" className="tsearch">
              <span style={{fontSize:16,color:"#94A3B8"}}>&#128269;</span>
              <input name="q" placeholder="\u0E04\u0E49\u0E19\u0E2B\u0E32 Serial, \u0E25\u0E39\u0E01\u0E04\u0E49\u0E32, Asset Code..." />
            </form>
            <div className="topbar-right">
              <div className="live-badge"><span className="live-dot" />System Online</div>
              <div className="top-avatar" title={userEmail}>{userInitial}</div>
            </div>
          </header>

          <main className="content">
            <div className="page-title">Dashboard Overview</div>
            <div className="page-date">{today}</div>

            {expiringContractsList.length > 0 && (() => {
              const urgent = expiringContractsList.filter(ec => Math.ceil((ec.endDate.getTime() - Date.now()) / 86400000) <= 30).length;
              const soonest = expiringContractsList[0];
              const soonestDays = Math.ceil((soonest.endDate.getTime() - Date.now()) / 86400000);
              return (
                <div className="alert" style={{marginBottom:"24px"}}>
                  <span style={{fontSize:22}}>&#9888;&#65039;</span>
                  <div style={{flex:1}}>
                    <div className="alert-title">
                      \u0E21\u0E35 {expiringContractsList.length} \u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E17\u0E35\u0E48\u0E08\u0E30\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E20\u0E32\u0E22\u0E43\u0E19 90 \u0E27\u0E31\u0E19
                      {urgent > 0 && <span style={{marginLeft:"10px",background:"#DC2626",color:"white",fontSize:"11px",padding:"1px 8px",borderRadius:"99px",fontWeight:700}}>{urgent} \u0E40\u0E23\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19 &#8804;30\u0E27\u0E31\u0E19</span>}
                    </div>
                    <div className="alert-sub">
                      \u0E43\u0E01\u0E25\u0E49\u0E2A\u0E38\u0E14: {soonest.contractNo} &#8212; {soonest.customer.companyName} \u0E40\u0E2B\u0E25\u0E37\u0E2D {soonestDays} \u0E27\u0E31\u0E19 ({soonest.endDate.toLocaleDateString("th-TH")})
                    </div>
                  </div>
                  <a href="/contracts?sort=endDate&order=asc&status=ACTIVE" className="alert-btn">\u0E14\u0E39\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 &#8594;</a>
                </div>
              );
            })()}

            <div className="kpi-grid">
              {kpis.map((k) => (
                <a key={k.label} href={k.href} className="kpi-card">
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{background:k.bg}}>{k.icon}</div>
                    <span className="kpi-change" style={{background:k.bg,color:k.color}}>{k.change}</span>
                  </div>
                  <div className="kpi-value" style={{color:k.color}}>{k.value.toLocaleString()}</div>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-sub">{k.sub}</div>
                  <div className="kpi-bar" style={{background:"linear-gradient(90deg,"+k.color+"40,"+k.color+"10)"}} />
                </a>
              ))}
            </div>

            <div className="two-col">
              <div className="card">
                <div className="card-title">
                  Quick Access
                  <span className="card-badge">6 modules</span>
                </div>
                <div className="ql-grid">
                  {quickLinks.map((q) => (
                    <a key={q.label} href={q.href} className="ql-item">
                      <div className="ql-icon" style={{background:q.color+"18"}}>{q.icon}</div>
                      <div>
                        <div className="ql-name">{q.label}</div>
                        <div className="ql-desc">{q.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">System Status</div>
                {[
                  {key:"Database",           val:"Connected",                dot:"#10B981",vc:"#059669"},
                  {key:"Active Contracts",   val:activeContracts+" \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", dot:"#3B82F6",vc:"#2563EB"},
                  {key:"Total Assets",       val:totalAssets+" \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23",     dot:"#8B5CF6",vc:"#7C3AED"},
                  {key:"Customers",          val:totalCustomers+" \u0E23\u0E32\u0E22",     dot:"#10B981",vc:"#059669"},
                  {key:"Expiring (90d)",     val:expiringAssets+" \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23",  dot:expiringAssets>0?"#F59E0B":"#10B981",vc:expiringAssets>0?"#D97706":"#059669"},
                  {key:"Contracts Expiring", val:expiringContracts+" \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23",dot:expiringContracts>0?"#EF4444":"#10B981",vc:expiringContracts>0?"#DC2626":"#059669"},
                ].map((s) => (
                  <div key={s.key} className="status-row">
                    <div className="s-left">
                      <div className="s-dot" style={{background:s.dot}} />
                      <span className="s-key">{s.key}</span>
                    </div>
                    <span className="s-val" style={{color:s.vc}}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-footer">
              iTAS BackOffice System - IT Asset and Maintenance Contract Management - 2026 iTAS Solutions
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
