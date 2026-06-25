"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Boxes,
  Building2,
  FileSpreadsheet,
  FileText,
  Gauge,
  KeyRound,
  LogOut,
  Menu,
  Search,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AppShellUser = {
  name: string;
  email: string;
  role: string;
};

const navItems = [
  { icon: Gauge, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "Contracts", href: "/contracts" },
  { icon: Boxes, label: "Assets", href: "/assets" },
  { icon: Building2, label: "Customers", href: "/customers" },
  { icon: Upload, label: "Import Data", href: "/import" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: KeyRound, label: "Licenses", href: "/licenses" },
  { icon: BarChart3, label: "Reports", href: "/api/reports/contracts?format=xlsx" },
];

const pageLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contracts": "Contracts",
  "/assets": "Assets",
  "/customers": "Customers",
  "/import": "Import Data",
  "/search": "Search",
  "/licenses": "Licenses",
};

function getPageLabel(pathname: string) {
  const matched = Object.keys(pageLabels)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(path));
  return matched ? pageLabels[matched] : "BackOffice";
}

export default function AppShellClient({
  user,
  children,
}: {
  user: AppShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("itas-sidebar-collapsed");
    if (stored) setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("itas-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const userInitial = (user.name || user.email || "U").charAt(0).toUpperCase();
  const pageLabel = useMemo(() => getPageLabel(pathname), [pathname]);
  const isLocalSearchPage = pathname.startsWith("/contracts") || pathname.startsWith("/assets");
  const topSearchAction = isLocalSearchPage ? pathname : "/search";
  const topSearchName = isLocalSearchPage ? "search" : "q";
  const topSearchValue = searchParams.get(topSearchName) ?? "";
  const preservedSearchParams = Array.from(searchParams.entries()).filter(
    ([key]) => key !== "search" && key !== "q"
  );

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar-head">
          <Link href="/dashboard" className="app-logo" aria-label="Go to dashboard">
            <Image
              src="/itas-logo.png"
              alt="iTAS Solutions"
              width={120}
              height={44}
              priority
            />
          </Link>
          <button
            type="button"
            className="app-sidebar-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="app-section-label">Main Menu</div>
        <nav className="app-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href !== "/api/reports/contracts?format=xlsx" &&
              pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`app-nav-item ${active ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="app-sidebar-footer">
          <div className="app-user">
            <div className="app-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="app-user-meta">
              <div className="app-user-name">{user.name}</div>
              <div className="app-user-role">{user.role}</div>
            </div>
          </div>
          <button
            type="button"
            className="app-signout"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="app-main-area">
        <header className="app-topbar">
          <div className="app-breadcrumb" aria-label="Breadcrumb">
            <span>iTAS BackOffice</span>
            <strong>{pageLabel}</strong>
          </div>

          <form method="GET" action={topSearchAction} className="app-top-search">
            {isLocalSearchPage &&
              preservedSearchParams.map(([key, value]) => (
                <input key={`${key}-${value}`} type="hidden" name={key} value={value} />
              ))}
            <Search size={16} aria-hidden="true" />
            <input
              name={topSearchName}
              type="search"
              defaultValue={topSearchValue}
              placeholder={
                pathname.startsWith("/contracts")
                  ? "Search contract, customer, project, serial..."
                  : pathname.startsWith("/assets")
                    ? "Search serial, customer, asset code..."
                    : "Search serial, customer, asset code..."
              }
              aria-label={isLocalSearchPage ? `Search ${pageLabel}` : "Global search"}
            />
          </form>

          <div className="app-top-actions">
            <div className="app-live-badge">
              <span />
              System Online
            </div>
            <div className="app-top-avatar" title={user.email || user.name}>
              {userInitial}
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
