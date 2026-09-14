import type { Prisma } from "@prisma/client";

export const CONTRACT_STATUSES = ["ACTIVE", "EXPIRED", "PENDING_RENEWAL", "DRAFT", "CANCELLED"] as const;
export const CONTRACT_SORTS = ["contractNo", "customer", "startDate", "endDate", "assets", "status"] as const;
export type ContractListParams = Record<string, string | string[] | undefined>;
const value = (params: ContractListParams, key: string) => typeof params[key] === "string" ? params[key] as string : "";
const dayMs = 86_400_000;

function validDate(text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : "";
}

export function parseContractListParams(params: ContractListParams) {
  const page = Number(value(params, "page"));
  const pageSize = Number(value(params, "pageSize"));
  const endFrom = validDate(value(params, "endFrom"));
  const requestedEndTo = validDate(value(params, "endTo"));
  const endTo = endFrom && requestedEndTo && endFrom > requestedEndTo ? "" : requestedEndTo;
  return {
    search: value(params, "search").trim().slice(0, 300),
    customer: value(params, "customer").slice(0, 100),
    status: CONTRACT_STATUSES.find(status => status === value(params, "status")) ?? "",
    sort: CONTRACT_SORTS.find(sort => sort === value(params, "sort")) ?? "contractNo",
    order: value(params, "order") === "asc" ? "asc" as const : "desc" as const,
    endDate: ["30", "60", "90", "overdue"].includes(value(params, "endDate")) ? value(params, "endDate") : "",
    assets: ["with", "without"].includes(value(params, "assets")) ? value(params, "assets") : "",
    endFrom,
    endTo,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: [10, 25, 50].includes(pageSize) ? pageSize : 10,
  };
}
export type ContractListFilters = ReturnType<typeof parseContractListParams>;

export function contractListWhere(filters: ContractListFilters, now: Date): Prisma.ContractWhereInput {
  const search = filters.search;
  const dates: Prisma.ContractWhereInput[] = [];
  if (filters.endDate === "overdue") dates.push({ endDate: { lt: now } });
  else if (filters.endDate) dates.push({ endDate: { gte: now, lte: new Date(now.getTime() + Number(filters.endDate) * dayMs) } });
  if (filters.endFrom) dates.push({ endDate: { gte: new Date(`${filters.endFrom}T00:00:00+07:00`) } });
  if (filters.endTo) dates.push({ endDate: { lte: new Date(`${filters.endTo}T23:59:59.999+07:00`) } });
  return {
    deletedAt: null,
    ...(filters.customer ? { customerId: filters.customer } : {}),
    ...(filters.assets === "with" ? { items: { some: {} } } : filters.assets === "without" ? { items: { none: {} } } : {}),
    ...(dates.length ? { AND: dates } : {}),
    ...(search ? { OR: [
      ...["contractNo", "soNo", "poNo", "serviceDesc"].map(field => ({ [field]: { contains: search, mode: "insensitive" } })),
      { customer: { companyName: { contains: search, mode: "insensitive" } } },
      { site: { siteName: { contains: search, mode: "insensitive" } } },
      { vendor: { name: { contains: search, mode: "insensitive" } } },
      { items: { some: { OR: ["serialNumber", "partNumber", "description", "sla"].map(field => ({ [field]: { contains: search, mode: "insensitive" } })) } } },
    ] as Prisma.ContractWhereInput[] } : {}),
  };
}

// Select only fields rendered in the list or its exports; never serialize full contracts.
export const contractListSelect = {
  id: true, contractNo: true, serviceDesc: true, startDate: true, endDate: true, status: true,
  customer: { select: { companyName: true } }, _count: { select: { items: true } },
} satisfies Prisma.ContractSelect;
export type ContractListRecord = Prisma.ContractGetPayload<{ select: typeof contractListSelect }>;
export type ContractListRow = {
  id: string; contractNo: string; customer: string; project: string;
  startDate: string; endDate: string; days: number; assets: number; status: string; label: string;
};

export function prepareContractList(records: ContractListRecord[], filters: ContractListFilters, now: Date) {
  const counts: Record<string, number> = { ALL: records.length };
  const rows: ContractListRow[] = records.map(record => {
    const days = Math.ceil((record.endDate.getTime() - now.getTime()) / dayMs);
    // Preserve the existing 30-day renewal grace period.
    const status = record.status === "ACTIVE" && days < 0 ? (days < -30 ? "EXPIRED" : "PENDING_RENEWAL") : record.status;
    counts[status] = (counts[status] ?? 0) + 1;
    const label = status === "ACTIVE" && days <= 90 ? "Expiring soon" : {
      ACTIVE: "Active", EXPIRED: "Expired", PENDING_RENEWAL: "Pending Renewal", DRAFT: "Draft", CANCELLED: "Cancelled",
    }[status];
    return { id: record.id, contractNo: record.contractNo, customer: record.customer.companyName,
      project: record.serviceDesc?.trim() || "—", startDate: record.startDate.toISOString(),
      endDate: record.endDate.toISOString(), days, assets: record._count.items, status, label };
  });
  const matching = rows.filter(row => !filters.status || row.status === filters.status);
  matching.sort((a, b) => {
    const key = filters.sort;
    const comparison = key === "assets" ? a.assets - b.assets : String(a[key]).localeCompare(String(b[key]), "en", { numeric: true });
    return (filters.order === "asc" ? comparison : -comparison) || a.id.localeCompare(b.id);
  });
  const totalPages = Math.max(1, Math.ceil(matching.length / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  return { counts, matching, total: matching.length, totalPages, page,
    rows: matching.slice((page - 1) * filters.pageSize, page * filters.pageSize) };
}

export function contractListQuery(filters: ContractListFilters, changes: Record<string, string | number> = {}) {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...changes }).forEach(([key, value]) => { if (value !== "") params.set(key, String(value)); });
  return params.toString();
}
export function contractPageNumbers(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from(new Set([1, ...Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index), totalPages])).sort((a, b) => a - b);
}
export function contractDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" });
}
// Spreadsheet applications may execute untrusted strings as formulas when opening CSV.
export function contractCsvCell(value: string | number) {
  const text = String(value);
  const safe = typeof value === "string" && /^[\s\uFEFF]*[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
