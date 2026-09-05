import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AlertCircle, AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Clock3, FileText, MoreHorizontal, Plus, Search } from "lucide-react";
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

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await auth();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY_MS);
  const in60 = new Date(now.getTime() + 60 * DAY_MS);
  const in90 = new Date(now.getTime() + 90 * DAY_MS);

  const params = await searchParams;
  const requestedPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const pageSize = 10;
  const attentionWhere: Prisma.ContractWhereInput = {
    deletedAt: null, endDate: { lte: in90 }, status: { in: ["ACTIVE", "PENDING_RENEWAL", "EXPIRED"] },
  };
  const [within30, within60, within90, activeContracts, totalItems, nearestContract] = await Promise.all([
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gte: now, lte: in30 } } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gt: in30, lte: in60 } } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gt: in60, lte: in90 } } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE", endDate: { gt: in90 } } }),
    prisma.contract.count({ where: attentionWhere }),
    prisma.contract.findFirst({
      where: { ...attentionWhere, endDate: { gte: now, lte: in90 } },
      orderBy: [{ endDate: "asc" }, { id: "asc" }],
      include: {
        customer: { select: { companyName: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
  const attentionContracts = await prisma.contract.findMany({
    where: attentionWhere,
    orderBy: [{ endDate: "desc" }, { id: "asc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: {
      customer: { select: { companyName: true } },
      createdBy: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  const pageNumbers = Array.from(new Set(totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [1, currentPage - 1, currentPage, currentPage + 1, totalPages]))
    .filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
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
            <div><h2>Contracts Expiring Within 90 Days</h2><span>({totalItems.toLocaleString()} items)</span></div>
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
          <div className={styles.tableFooter}>
            <span role="status">Showing {attentionContracts.length} of {totalItems.toLocaleString()} items</span>
            <nav className={styles.pagination} aria-label="Contract pagination">
              {currentPage > 1 ? <Link href={`/dashboard?page=${currentPage - 1}`} scroll={false} aria-label="Previous page"><ChevronLeft size={18} /></Link> : <span aria-disabled="true" aria-label="Previous page"><ChevronLeft size={18} /></span>}
              {pageNumbers.map((page, index) => <span className={styles.pageGroup} key={page}>
                {index > 0 && page - pageNumbers[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}
                <Link href={`/dashboard?page=${page}`} scroll={false} aria-label={`Page ${page}`} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>
              </span>)}
              {currentPage < totalPages ? <Link href={`/dashboard?page=${currentPage + 1}`} scroll={false} aria-label="Next page"><ChevronRight size={18} /></Link> : <span aria-disabled="true" aria-label="Next page"><ChevronRight size={18} /></span>}
            </nav>
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
