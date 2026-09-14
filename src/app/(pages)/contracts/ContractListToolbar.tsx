"use client";

import { CalendarDays, ChevronDown, ListFilter, Search, Upload } from "lucide-react";
import { useState } from "react";
import type { ContractListFilters } from "@/lib/contract-list";
import styles from "./contracts.module.css";

type Props = {
  filters: ContractListFilters;
  customers: { id: string; companyName: string }[];
  canExport: boolean; selected: string[]; pending: boolean;
  navigate: (changes: Record<string, string | number>) => void;
  exportQuery: string;
};
export default function ContractListToolbar({ filters, customers, canExport, selected, pending, navigate, exportQuery }: Props) {
  const [search, setSearch] = useState(filters.search);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  async function exportRows(format: "csv" | "xlsx", selection = false) {
    setExportError(""); setExporting(true);
    try {
      const params = new URLSearchParams(exportQuery);
      params.set("format", format);
      if (selection) params.set("selected", selected.join(","));
      const response = await fetch(`/api/contracts/export?${params}`);
      if (!response.ok) throw new Error("Unable to export contracts. Please try again.");
      const expectedType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";
      if (!response.headers.get("content-type")?.includes(expectedType)) {
        throw new Error("Unexpected export response.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `contracts.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError("Unable to export contracts. Please try again."); }
    finally { setExporting(false); }
  }
  return <>
    <div className={styles.toolbar}>
      <form className={styles.search} onSubmit={event => { event.preventDefault(); navigate({ search }); }}>
        <button type="submit" aria-label="Search contracts" disabled={pending}><Search size={19} /></button>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search contract, customer, PO or serial..." aria-label="Search contract, customer, PO or serial" maxLength={300} />
      </form>
      <label className={styles.selectControl}>
        <select aria-label="Customer" value={filters.customer} disabled={pending} onChange={event => navigate({ customer: event.target.value })}>
          <option value="">All Customers</option>
          {customers.map(customer => <option value={customer.id} key={customer.id}>{customer.companyName}</option>)}
        </select><ChevronDown size={15} aria-hidden="true" />
      </label>
      <label className={`${styles.selectControl} ${styles.endDate}`}>
        <CalendarDays size={18} aria-hidden="true" />
        <select aria-label="End date" value={filters.endDate} disabled={pending} onChange={event => navigate({ endDate: event.target.value })}>
          <option value="">End date</option><option value="30">Within 30 days</option><option value="60">Within 60 days</option><option value="90">Within 90 days</option><option value="overdue">Past end date</option>
        </select><ChevronDown size={15} aria-hidden="true" />
      </label>
      <details className={styles.dropdown}>
        <summary><ListFilter size={18} /> More filters{(filters.assets || filters.endFrom || filters.endTo) && <span className={styles.filterDot} />}<ChevronDown size={15} /></summary>
        <form className={styles.filterPanel} onSubmit={event => {
          event.preventDefault(); const data = new FormData(event.currentTarget);
          navigate({ assets: String(data.get("assets") || ""), endFrom: String(data.get("endFrom") || ""), endTo: String(data.get("endTo") || "") });
          event.currentTarget.closest("details")?.removeAttribute("open");
        }}>
          <label>Assets<select name="assets" defaultValue={filters.assets}><option value="">Any asset count</option><option value="with">With assets</option><option value="without">Without assets</option></select></label>
          <label>End date from<input type="date" name="endFrom" defaultValue={filters.endFrom} /></label>
          <label>End date to<input type="date" name="endTo" defaultValue={filters.endTo} min={filters.endFrom || undefined} /></label>
          <button type="submit" className={styles.applyButton} disabled={pending}>Apply filters</button>
        </form>
      </details>
      {canExport && <details className={`${styles.dropdown} ${styles.export}`}>
        <summary><Upload size={18} /> {exporting ? "Exporting…" : "Export"}<ChevronDown size={15} /></summary>
        <div className={styles.exportPanel}>
          <button type="button" disabled={exporting} onClick={() => exportRows("xlsx")}>All matching contracts (.xlsx)</button>
          <button type="button" disabled={exporting} onClick={() => exportRows("csv")}>All matching contracts (.csv)</button>
          <button type="button" disabled={!selected.length || exporting} onClick={() => exportRows("csv", true)}>Selected rows ({selected.length}) (.csv)</button>
        </div>
      </details>}
    </div>
    {exportError && <p className={styles.error} role="alert">{exportError}</p>}
  </>;
}
