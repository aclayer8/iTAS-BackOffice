"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownUp, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { contractDate, contractListQuery, contractPageNumbers, type ContractListFilters, type ContractListRow } from "@/lib/contract-list";
import ContractListToolbar from "./ContractListToolbar";
import ContractRowActions from "./ContractRowActions";
import styles from "./contracts.module.css";

type Props = {
  rows: ContractListRow[]; filters: ContractListFilters; counts: Record<string, number>;
  customers: { id: string; companyName: string }[];
  total: number; totalPages: number; page: number;
  canEdit: boolean; canDelete: boolean; canExport: boolean;
};
const tabs = [{ label: "All", value: "" }, { label: "Active", value: "ACTIVE" }, { label: "Expired", value: "EXPIRED" }, { label: "Pending Renewal", value: "PENDING_RENEWAL" }, { label: "Draft", value: "DRAFT" }];
const columns = [{ label: "Contract No.", key: "contractNo" }, { label: "Customer / Project", key: "customer" }, { label: "Coverage Period", key: "endDate" }, { label: "Assets", key: "assets" }, { label: "Status", key: "status" }, { label: "Time Remaining", key: "endDate" }];

export default function ContractsList({ rows, filters, counts, customers, total, totalPages, page, canEdit, canDelete, canExport }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const selectAll = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selected.length > 0 && selected.length < rows.length;
  }, [selected, rows.length]);
  useEffect(() => {
    const visibleIds = new Set(rows.map(row => row.id));
    setSelected(previous => previous.filter(id => visibleIds.has(id)));
  }, [rows]);
  function navigate(changes: Record<string, string | number>) {
    // Fixed pathname and URLSearchParams encoding keep navigation scoped to this list.
    // https://nextjs.org/docs/15/app/api-reference/functions/use-router
    startTransition(() => router.push(`/contracts?${contractListQuery(filters, { page: 1, ...changes })}`, { scroll: false }));
  }
  const href = (changes: Record<string, string | number>) => `/contracts?${contractListQuery(filters, changes)}`;
  const pageNumbers = contractPageNumbers(page, totalPages);
  const activeFilters = filters.search || filters.customer || filters.endDate || filters.assets || filters.endFrom || filters.endTo;
  return <div className={styles.page} aria-busy={pending}>
    <header className={styles.heading}>
      <div><h1>Contract Management</h1><p>{total.toLocaleString()} contracts</p></div>
      {canEdit && <Link className={styles.addButton} href="/contracts/new"><Plus size={19} /> Add Contracts</Link>}
    </header>
    <ContractListToolbar filters={filters} customers={customers} canExport={canExport} selected={selected} pending={pending} navigate={navigate} exportQuery={contractListQuery(filters)} />
    <div className={styles.tabRow}>
      <nav className={styles.tabs} aria-label="Contract status">
        {[...tabs, ...(counts.CANCELLED || filters.status === "CANCELLED" ? [{ label: "Cancelled", value: "CANCELLED" }] : [])].map(tab => <Link key={tab.value} href={href({ status: tab.value, page: 1 })} scroll={false} aria-current={filters.status === tab.value ? "page" : undefined}>
          {tab.label}<span>{(counts[tab.value || "ALL"] || 0).toLocaleString()}</span>
        </Link>)}
      </nav>
      {activeFilters && <Link href="/contracts" className={styles.clearFilters}>Clear filters</Link>}
      {selected.length > 0 && <span className={styles.selection} role="status">{selected.length} selected on this page</span>}
    </div>
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className="sr-only">Contracts with customer, coverage period, asset count, status and remaining time</caption>
        <thead><tr>
          <th className={styles.checkboxCell}><input ref={selectAll} type="checkbox" aria-label="Select all contracts on this page" checked={rows.length > 0 && selected.length === rows.length} disabled={!rows.length || !canExport} onChange={event => setSelected(event.target.checked ? rows.map(row => row.id) : [])} /></th>
          {columns.map(column => <th key={column.label} scope="col" aria-sort={filters.sort === column.key ? (filters.order === "asc" ? "ascending" : "descending") : "none"}>
            <Link href={href({ sort: column.key, order: filters.sort === column.key && filters.order === "asc" ? "desc" : "asc", page: 1 })} scroll={false}>{column.label}<ArrowDownUp size={12} aria-hidden="true" /></Link>
          </th>)}
          <th scope="col"><span className="sr-only">Actions</span></th>
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className={selected.includes(row.id) ? styles.selectedRow : undefined}>
          <td className={styles.checkboxCell}><input type="checkbox" aria-label={`Select ${row.contractNo}`} checked={selected.includes(row.id)} disabled={!canExport} onChange={event => setSelected(previous => event.target.checked ? [...previous, row.id] : previous.filter(id => id !== row.id))} /></td>
          <td className={styles.contractNumber}><Link href={`/contracts/${row.id}`}>{row.contractNo}</Link></td>
          <td className={styles.customerCell}><strong title={row.customer}>{row.customer}</strong><span title={row.project}>{row.project}</span></td>
          <td className={styles.coverage}>{contractDate(row.startDate)} <span>–</span> {contractDate(row.endDate)}</td>
          <td>{row.assets}</td>
          <td><span className={`${styles.badge} ${styles[row.label === "Expiring soon" ? "expiring" : row.status.toLowerCase()]}`}><i aria-hidden="true" />{row.label}</span></td>
          <td className={styles.remaining}>{row.days} days</td>
          <td className={styles.actionsCell}><ContractRowActions row={row} canEdit={canEdit} canDelete={canDelete} /></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={8} className={styles.empty}><strong>No contracts found</strong><span>Try another search or clear the filters.</span><Link href="/contracts">Clear filters</Link></td></tr>}
        </tbody>
      </table>
    </div>
    <footer className={styles.footer}>
      <div className={styles.pageSize}><label htmlFor="contract-page-size">Rows per page:</label><select id="contract-page-size" value={filters.pageSize} disabled={pending} onChange={event => navigate({ pageSize: event.target.value })}>{[10, 25, 50].map(size => <option key={size}>{size}</option>)}</select>
        <span role="status">{total ? (page - 1) * filters.pageSize + 1 : 0} - {Math.min(page * filters.pageSize, total)} of {total.toLocaleString()}</span>
      </div>
      <nav className={styles.pagination} aria-label="Contract pagination">
        {page > 1 ? <Link href={href({ page: page - 1 })} scroll={false} aria-label="Previous page"><ChevronLeft size={19} /></Link> : <span aria-disabled="true" aria-label="Previous page"><ChevronLeft size={19} /></span>}
        {pageNumbers.map((number, index) => <span className={styles.pageGroup} key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<Link href={href({ page: number })} scroll={false} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined}>{number}</Link></span>)}
        {page < totalPages ? <Link href={href({ page: page + 1 })} scroll={false} aria-label="Next page"><ChevronRight size={19} /></Link> : <span aria-disabled="true" aria-label="Next page"><ChevronRight size={19} /></span>}
      </nav>
    </footer>
  </div>;
}
