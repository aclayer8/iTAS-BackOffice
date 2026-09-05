import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AlertCircle, AlertTriangle, ArrowRight, Clock3, FileText, MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const daysUntil = (date: Date) => Math.ceil((date.getTime() - Date.now()) / DAY_MS);
const formatDate = (date: Date) => date.toLocaleDateString("en-GB", {
  timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric",
});

function effectiveStatus(status: string, endDate: Date) {
  const days = daysUntil(endDate);
  if (status === "ACTIVE" && days < -30) return "EXPIRED";
  if (status === "ACTIVE" && days < 0) return "PENDING_RENEWAL";
  return status;
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false,
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY_MS);
  const in60 = new Date(now.getTime() + 60 * DAY_MS);
  const in90 = new Date(now.getTime() + 90 * DAY_MS);

  const [within30, within60, within90, activeContracts, attentionContracts] = await Promise.all([
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gte: now, lte: in30 } } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gt: in30, lte: in60 } } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gt: in60, lte: in90 } } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gt: in90 } } }),
    prisma.contract.findMany({
      where: { deletedAt: null, endDate: { lte: in90 }, status: { in: ["ACTIVE", "PENDING_RENEWAL", "EXPIRED"] } },
      orderBy: { endDate: "desc" },
      take: 10,
      include: {
        customer: { select: { companyName: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
  ]);

  const nearestContract = [...attentionContracts]
    .filter((contract) => daysUntil(contract.endDate) >= 0)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())[0];
  const nearestItem = nearestContract?.items[0];
  const displayName = session?.user?.name?.trim() || "User";
  const summary = [
    { label: "Expiring within 30 days", value: within30, tone: "critical", icon: AlertCircle, note: within30 ? "Requires action" : "No immediate action" },
    { label: "Expiring within 60 days", value: within60, tone: "warning", icon: AlertTriangle, note: "Plan renewal" },
    { label: "Expiring within 90 days", value: within90, tone: "notice", icon: Clock3, note: "Upcoming" },
    { label: "Active contracts", value: activeContracts, tone: "neutral", icon: FileText, note: "Not expiring soon" },
  ];

  return (
    <AppShell>
      <div className={styles.page}>
        <section className={styles.intro}>
          <h1>{greeting()}, {displayName}</h1>
          <p>Search contract coverage and support details by serial number, customer, PO, or asset code.</p>
        </section>

        <div className={styles.searchRow}>
          <form method="GET" action="/search" className={styles.searchForm}>
            <Search size={24} aria-hidden="true" />
            <input name="q" type="search" aria-label="Search contracts and assets" placeholder="Search serial, customer, PO, asset code..." />
            <button type="submit">Search</button>
          </form>
          <Link href="/contracts/new" className={styles.addButton}><Plus size={21} /> Add Contract</Link>
        </div>

        {nearestContract && (
          <Link href={`/contracts/${nearestContract.id}`} className={styles.focusContract}>
            <div className={styles.focusHeading}><span>Next contract requiring attention</span><strong>{daysUntil(nearestContract.endDate)} days left</strong></div>
            <div className={styles.focusGrid}>
              <div className={styles.focusIdentity}>
                <span className={styles.assetGlyph}><FileText size={26} /></span>
                <div><strong>{nearestItem?.serialNumber || nearestContract.contractNo}</strong><span>{nearestItem?.description || nearestContract.serviceDesc || "Maintenance contract"}</span></div>
              </div>
              <div><span>Customer</span><strong>{nearestContract.customer.companyName}</strong></div>
              <div><span>Contract</span><strong>{nearestContract.contractNo}</strong></div>
              <div><span>Contract period</span><strong>{formatDate(nearestContract.startDate)} - {formatDate(nearestContract.endDate)}</strong></div>
              <div><span>SLA</span><strong>{nearestItem?.sla || nearestContract.slaType.replaceAll("_", " ")}</strong></div>
              <ArrowRight size={20} />
            </div>
          </Link>
        )}

        <section className={styles.summaryBand} aria-labelledby="expiring-summary-title">
          <div className={styles.summaryTitle}><h2 id="expiring-summary-title">Contracts Expiring Soon</h2><p>{within30 + within60 + within90} contracts require attention</p></div>
          {summary.map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className={`${styles.summaryItem} ${styles[item.tone]}`}>
              <span className={styles.summaryIcon}><Icon size={22} /></span>
              <div><strong>{item.value.toLocaleString()}</strong><span>{item.label}</span><small>{item.note}</small></div>
            </div>;
          })}
        </section>

        <section className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div><h2>Contracts Expiring Within 90 Days</h2><span>{attentionContracts.length} shown</span></div>
            <Link href="/contracts?sort=endDate&order=asc">View all contracts <ArrowRight size={16} /></Link>
          </div>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th>Contract No.</th><th>Customer</th><th>Product / Asset</th><th>Serial No.</th><th>Contract End</th><th>Days Left</th><th>SLA</th><th>Owner</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {attentionContracts.map((contract) => {
                  const item = contract.items[0];
                  const days = daysUntil(contract.endDate);
                  const status = effectiveStatus(contract.status, contract.endDate);
                  return <tr key={contract.id}>
                    <td><Link href={`/contracts/${contract.id}`}>{contract.contractNo}</Link></td>
                    <td className={styles.customer}>{contract.customer.companyName}</td>
                    <td>{item?.description || contract.serviceDesc || "-"}</td>
                    <td>{item?.serialNumber || "-"}</td>
                    <td>{formatDate(contract.endDate)}</td>
                    <td className={days < 0 ? styles.daysExpired : days <= 30 ? styles.daysWarning : styles.daysHealthy}>{days}d</td>
                    <td>{item?.sla || contract.slaType.replaceAll("_", " ")}</td>
                    <td>{contract.createdBy.name}</td>
                    <td><span className={`${styles.status} ${styles[`status${status}`]}`}>{status.replaceAll("_", " ")}</span></td>
                    <td><Link className={styles.rowAction} href={`/contracts/${contract.id}`} aria-label={`Open ${contract.contractNo}`}><MoreHorizontal size={19} /></Link></td>
                  </tr>;
                })}
                {!attentionContracts.length && <tr><td colSpan={10} className={styles.empty}>No contracts require attention within 90 days.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <footer className={styles.footer}>
          <div><strong>iTAS Solutions Co., Ltd.</strong><span>Asset & Maintenance Contract Management System</span></div>
          <p><i /> Keep Your Business Running</p>
        </footer>
      </div>
    </AppShell>
  );
}
