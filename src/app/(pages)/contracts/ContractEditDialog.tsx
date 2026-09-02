"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

const SLA_TYPES = ["ONSITE_NBD", "ONSITE_4HR", "REMOTE_NBD", "REMOTE_4HR", "BEST_EFFORT", "CUSTOM"] as const;
const SUPPORT_TYPES = ["BUSINESS_HOURS", "EXTENDED", "TWENTYFOUR_SEVEN", "CUSTOM"] as const;
const CONTRACT_STATUSES = ["DRAFT", "ACTIVE", "PENDING_RENEWAL", "EXPIRED", "CANCELLED"] as const;

type ContractItem = {
  id: string;
  partNumber: string | null;
  description: string | null;
  serialNumber: string | null;
  quantity: number | null;
  unit: string | null;
  sla: string | null;
  startDate: string | null;
  endDate: string | null;
};

type ContractRecord = {
  id: string;
  contractNo: string;
  customerId: string;
  soNo: string | null;
  poNo: string | null;
  serviceDesc: string | null;
  startDate: string;
  endDate: string;
  slaType: (typeof SLA_TYPES)[number];
  supportType: (typeof SUPPORT_TYPES)[number];
  status: (typeof CONTRACT_STATUSES)[number];
  autoRenew: boolean;
  totalValue: string | null;
  currency: string;
  remark: string | null;
  customer: { companyName: string };
  items: ContractItem[];
};

type ContractForm = {
  contractNo: string;
  customerId: string;
  soNo: string;
  poNo: string;
  serviceDesc: string;
  startDate: string;
  endDate: string;
  slaType: ContractRecord["slaType"];
  supportType: ContractRecord["supportType"];
  status: ContractRecord["status"];
  autoRenew: boolean;
  totalValue: string;
  currency: string;
  remark: string;
};

type CustomerOption = {
  id: string;
  companyName: string;
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  padding: "8px 10px",
  backgroundColor: "white",
  color: "#0f172a",
  fontFamily: "inherit",
  fontSize: "14px",
};

const LABEL_STYLE: CSSProperties = {
  display: "block",
  marginBottom: "4px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 700,
};

function toDateInput(value: string) {
  return value.slice(0, 10);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB") : "-";
}

function toForm(contract: ContractRecord): ContractForm {
  return {
    contractNo: contract.contractNo,
    customerId: contract.customerId,
    soNo: contract.soNo ?? "",
    poNo: contract.poNo ?? "",
    serviceDesc: contract.serviceDesc ?? "",
    startDate: toDateInput(contract.startDate),
    endDate: toDateInput(contract.endDate),
    slaType: contract.slaType,
    supportType: contract.supportType,
    status: contract.status,
    autoRenew: contract.autoRenew,
    totalValue: contract.totalValue ?? "",
    currency: contract.currency,
    remark: contract.remark ?? "",
  };
}

export default function ContractEditDialog({
  contractId,
  contractNo,
}: {
  contractId: string;
  contractNo: string;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ContractForm | null>(null);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) closeDialog();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving]);

  useEffect(() => {
    if (open && form) firstInputRef.current?.focus();
  }, [open, form]);

  function setField<K extends keyof ContractForm>(field: K, value: ContractForm[K]) {
    setForm((current) => current ? { ...current, [field]: value } : current);
  }

  function closeDialog() {
    if (saving) return;
    setOpen(false);
    setForm(null);
    setItems([]);
    setError("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function openDialog() {
    setOpen(true);
    setLoading(true);
    setError("");
    setForm(null);

    try {
      const [contractResponse, customersResponse] = await Promise.all([
        fetch(`/api/contracts/${contractId}`),
        fetch("/api/customers?limit=100&page=1"),
      ]);
      const contractResult = await contractResponse.json();
      const customersResult = await customersResponse.json();

      if (!contractResponse.ok || !contractResult.success) {
        throw new Error(contractResult.error ?? "Unable to load contract.");
      }
      if (!customersResponse.ok || !customersResult.success) {
        throw new Error(customersResult.error ?? "Unable to load customers.");
      }

      const contract = contractResult.data as ContractRecord;
      const firstCustomerPage = customersResult.data as {
        data: CustomerOption[];
        totalPages: number;
      };
      const remainingPageCount = Math.min(firstCustomerPage.totalPages, 5) - 1;
      const remainingCustomerPages = remainingPageCount > 0
        ? await Promise.all(
            Array.from({ length: remainingPageCount }, (_, index) =>
              fetch(`/api/customers?limit=100&page=${index + 2}`).then((response) => response.json()),
            ),
          )
        : [];
      const customerOptions = [
        ...firstCustomerPage.data,
        ...remainingCustomerPages.flatMap((result) => result.success ? result.data.data as CustomerOption[] : []),
      ];
      if (!customerOptions.some((customer) => customer.id === contract.customerId)) {
        customerOptions.push({
          id: contract.customerId,
          companyName: contract.customer.companyName,
        });
      }
      setForm(toForm(contract));
      setItems(contract.items);
      setCustomers(customerOptions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load contract.");
    } finally {
      setLoading(false);
    }
  }

  async function saveContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError("End date must be after start date.");
      return;
    }

    const totalValue = form.totalValue.trim() ? Number(form.totalValue) : null;
    if (totalValue !== null && (!Number.isFinite(totalValue) || totalValue <= 0)) {
      setError("Total value must be greater than zero.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contractNo: form.contractNo.trim(),
          customerId: form.customerId,
          totalValue,
          currency: form.currency.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update contract.");
      }

      setOpen(false);
      setForm(null);
      router.refresh();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update contract.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Edit contract ${contractNo}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          border: "1px solid #bfdbfe",
          borderRadius: "7px",
          padding: "6px 10px",
          backgroundColor: "#eff6ff",
          color: "#1d4ed8",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        <Pencil size={14} aria-hidden="true" />
        Edit
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contract-edit-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backgroundColor: "rgba(15,23,42,.5)",
          }}
        >
          <div style={{ width: "min(980px, 100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: "12px", backgroundColor: "#f8fafc", boxShadow: "0 24px 70px rgba(15,23,42,.3)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "18px 22px", borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
              <div>
                <h2 id="contract-edit-title" style={{ margin: 0, color: "#1E3A5F", fontSize: "19px" }}>Edit Contract</h2>
                <div style={{ marginTop: "2px", color: "#64748b", fontSize: "13px" }}>{contractNo}</div>
              </div>
              <button type="button" onClick={closeDialog} disabled={saving} aria-label="Close edit contract dialog" style={{ border: "none", padding: "6px", background: "transparent", color: "#64748b", cursor: saving ? "not-allowed" : "pointer" }}>
                <X size={21} aria-hidden="true" />
              </button>
            </div>

            {loading && (
              <div role="status" aria-live="polite" style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>
                Loading contract data...
              </div>
            )}

            {!loading && !form && (
              <div style={{ padding: "32px 24px" }}>
                <div role="alert" style={{ padding: "12px 14px", border: "1px solid #fecaca", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#b91c1c", fontSize: "14px" }}>
                  {error || "Unable to load contract."}
                </div>
              </div>
            )}

            {!loading && form && (
              <form onSubmit={saveContract}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px" }}>
                  {error && (
                    <div role="alert" style={{ padding: "12px 14px", border: "1px solid #fecaca", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#b91c1c", fontSize: "14px" }}>
                      {error}
                    </div>
                  )}

                  <section style={{ borderRadius: "10px", padding: "18px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(15,23,42,.08)" }}>
                    <h3 style={{ margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontSize: "15px" }}>ข้อมูล Contract</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                      <div>
                        <label htmlFor={`contract-no-${contractId}`} style={LABEL_STYLE}>Contract No. *</label>
                        <input ref={firstInputRef} id={`contract-no-${contractId}`} required maxLength={100} value={form.contractNo} onChange={(event) => setField("contractNo", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <div>
                        <label htmlFor={`contract-customer-${contractId}`} style={LABEL_STYLE}>Customer *</label>
                        <select id={`contract-customer-${contractId}`} required value={form.customerId} onChange={(event) => setField("customerId", event.target.value)} style={INPUT_STYLE}>
                          <option value="">- Select customer -</option>
                          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`contract-po-${contractId}`} style={LABEL_STYLE}>PO No.</label>
                        <input id={`contract-po-${contractId}`} maxLength={100} value={form.poNo} onChange={(event) => setField("poNo", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <div>
                        <label htmlFor={`contract-so-${contractId}`} style={LABEL_STYLE}>SO No.</label>
                        <input id={`contract-so-${contractId}`} maxLength={100} value={form.soNo} onChange={(event) => setField("soNo", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <div>
                        <label htmlFor={`contract-start-${contractId}`} style={LABEL_STYLE}>Start Date *</label>
                        <input id={`contract-start-${contractId}`} type="date" required value={form.startDate} onChange={(event) => setField("startDate", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <div>
                        <label htmlFor={`contract-end-${contractId}`} style={LABEL_STYLE}>End Date *</label>
                        <input id={`contract-end-${contractId}`} type="date" required value={form.endDate} onChange={(event) => setField("endDate", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label htmlFor={`contract-service-${contractId}`} style={LABEL_STYLE}>Service Description</label>
                        <textarea id={`contract-service-${contractId}`} maxLength={1000} value={form.serviceDesc} onChange={(event) => setField("serviceDesc", event.target.value)} style={{ ...INPUT_STYLE, minHeight: "70px", resize: "vertical" }} />
                      </div>
                    </div>
                  </section>

                  <section style={{ borderRadius: "10px", padding: "18px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(15,23,42,.08)" }}>
                    <h3 style={{ margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontSize: "15px" }}>Service &amp; Commercial</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                      <div>
                        <label htmlFor={`contract-sla-${contractId}`} style={LABEL_STYLE}>SLA</label>
                        <select id={`contract-sla-${contractId}`} value={form.slaType} onChange={(event) => setField("slaType", event.target.value as ContractForm["slaType"])} style={INPUT_STYLE}>
                          {SLA_TYPES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`contract-support-${contractId}`} style={LABEL_STYLE}>Support Type</label>
                        <select id={`contract-support-${contractId}`} value={form.supportType} onChange={(event) => setField("supportType", event.target.value as ContractForm["supportType"])} style={INPUT_STYLE}>
                          {SUPPORT_TYPES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`contract-status-${contractId}`} style={LABEL_STYLE}>Status</label>
                        <select id={`contract-status-${contractId}`} value={form.status} onChange={(event) => setField("status", event.target.value as ContractForm["status"])} style={INPUT_STYLE}>
                          {CONTRACT_STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`contract-value-${contractId}`} style={LABEL_STYLE}>Total Value</label>
                        <input id={`contract-value-${contractId}`} type="number" min="0.01" step="0.01" value={form.totalValue} onChange={(event) => setField("totalValue", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <div>
                        <label htmlFor={`contract-currency-${contractId}`} style={LABEL_STYLE}>Currency</label>
                        <input id={`contract-currency-${contractId}`} required maxLength={10} value={form.currency} onChange={(event) => setField("currency", event.target.value)} style={INPUT_STYLE} />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "9px", alignSelf: "end", minHeight: "38px", color: "#334155", fontSize: "14px", fontWeight: 600 }}>
                        <input type="checkbox" checked={form.autoRenew} onChange={(event) => setField("autoRenew", event.target.checked)} />
                        Auto renewal
                      </label>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label htmlFor={`contract-remark-${contractId}`} style={LABEL_STYLE}>Remark</label>
                        <textarea id={`contract-remark-${contractId}`} maxLength={2000} value={form.remark} onChange={(event) => setField("remark", event.target.value)} style={{ ...INPUT_STYLE, minHeight: "64px", resize: "vertical" }} />
                      </div>
                    </div>
                  </section>

                  <section style={{ overflow: "hidden", borderRadius: "10px", backgroundColor: "white", boxShadow: "0 1px 3px rgba(15,23,42,.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
                      <div>
                        <h3 style={{ margin: 0, color: "#1e293b", fontSize: "15px" }}>รายการอุปกรณ์ / Items ({items.length})</h3>
                        <div style={{ marginTop: "3px", color: "#64748b", fontSize: "12px" }}>รายการแสดงเพื่ออ้างอิงและไม่ถูกเปลี่ยนโดยการบันทึกฟอร์มนี้</div>
                      </div>
                      <Link href={`/contracts/${contractId}`} style={{ flexShrink: 0, color: "#2563eb", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                        Edit items →
                      </Link>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc", color: "#64748b" }}>
                            {["#", "Part No.", "Description", "S/N", "Qty", "SLA", "Start", "End"].map((header) => <th key={header} style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>{header}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 10px" }}>{index + 1}</td>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{item.partNumber || "-"}</td>
                              <td style={{ maxWidth: "240px", padding: "8px 10px" }}>{item.description || "-"}</td>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{item.serialNumber || "-"}</td>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{item.quantity ?? "-"} {item.unit ?? ""}</td>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{item.sla || "-"}</td>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatDate(item.startDate)}</td>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatDate(item.endDate)}</td>
                            </tr>
                          ))}
                          {items.length === 0 && (
                            <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>No items</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                <div style={{ position: "sticky", bottom: 0, display: "flex", justifyContent: "flex-end", gap: "10px", padding: "15px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "white" }}>
                  <button type="button" onClick={closeDialog} disabled={saving} style={{ border: "1px solid #cbd5e1", borderRadius: "7px", padding: "9px 15px", backgroundColor: "white", color: "#334155", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "7px", border: "none", borderRadius: "7px", padding: "9px 15px", backgroundColor: saving ? "#94a3b8" : "#1E3A5F", color: "white", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}>
                    <Save size={16} aria-hidden="true" />
                    {saving ? "Saving..." : "Save Contract"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
