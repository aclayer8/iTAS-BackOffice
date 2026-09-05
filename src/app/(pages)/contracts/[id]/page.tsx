import prisma from "@/lib/prisma";
import Link from "next/link";
import { Eye } from "lucide-react";
import { notFound } from "next/navigation";
import ContractItemsEditor from "./ContractItemsEditor";

export const dynamic = "force-dynamic";

function daysLeft(end: Date | null): number | null {
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={{ color: "#9ca3af" }}>—</span>;
  const color = days < 0 ? "#ef4444" : days <= 30 ? "#f97316" : days <= 90 ? "#f59e0b" : "#10b981";
  const bg    = days < 0 ? "#fee2e2" : days <= 30 ? "#fff7ed" : days <= 90 ? "#fef9c3" : "#d1fae5";
  const label = days < 0 ? `หมดแล้ว ${Math.abs(days)}d` : `${days}d`;
  return (
    <span style={{ backgroundColor: bg, color, padding: "2px 8px", borderRadius: "99px", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981", DRAFT: "#6b7280", EXPIRED: "#ef4444",
  CANCELLED: "#9ca3af", PENDING_RENEWAL: "#f59e0b",
};

const TYPE_COLOR: Record<string, string> = {
  HARDWARE: "#2563eb", LICENSE: "#7c3aed", SUBSCRIPTION: "#0891b2",
  SERVICE: "#059669", SUPPORT: "#d97706",
};

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref  = from ?? "/contracts";
  const backLabel = from?.startsWith("/customers") ? "← Customer" : "← Contracts";

  const contract = await prisma.contract.findFirst({
    where: { OR: [{ id }, { contractNo: id }], deletedAt: null },
    include: {
      customer: true,
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!contract) notFound();

  // Fetch assets for items that have serialNumber or warrantyRef
  const serialNumbers = contract.items
    .map((i) => i.serialNumber)
    .filter(Boolean) as string[];
  const linkedAssetIds = contract.items
    .map((i) => i.warrantyRef)
    .filter(Boolean) as string[];

  const assets = serialNumbers.length > 0 || linkedAssetIds.length > 0
    ? await prisma.asset.findMany({
        where: {
          OR: [
            ...(serialNumbers.length > 0 ? [{ serialNumber: { in: serialNumbers, mode: "insensitive" as const } }] : []),
            ...(linkedAssetIds.length > 0 ? [{ id: { in: linkedAssetIds } }] : []),
          ],
        },
        select: { id: true, assetCode: true, serialNumber: true, brand: true, model: true, assetType: true, lifecycleStatus: true, warrantyEnd: true },
      })
    : [];

  const contractDays = daysLeft(contract.endDate);
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const itemRows = contract.items.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    partNumber: item.partNumber,
    description: item.description,
    serialNumber: item.serialNumber,
    quantity: item.quantity,
    unit: item.unit,
    startDate: item.startDate?.toISOString() ?? null,
    endDate: item.endDate?.toISOString() ?? null,
    sla: item.sla,
    remark: item.remark,
    sortOrder: item.sortOrder,
    linkedAssetCode: item.warrantyRef ? assetById.get(item.warrantyRef)?.assetCode ?? null : null,
  }));
  const assetRows = assets.map((asset) => ({
    assetCode: asset.assetCode,
    serialNumber: asset.serialNumber,
    brand: asset.brand,
    model: asset.model,
  }));
  const assetBySN = new Map(assets.map((a) => [a.serialNumber?.toLowerCase() ?? "", a]));

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: "16px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none" }}>Dashboard</Link>
        {" / "}
        <Link href={backHref} style={{ color: "#6b7280", textDecoration: "none" }}>{backLabel}</Link>
        {" / "}
        <span style={{ color: "#1E3A5F", fontWeight: 600 }}>{contract.contractNo}</span>
      </div>

      {/* Header card */}
      <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "24px 28px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>

          {/* Left: Contract info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "24px", fontWeight: 800, color: "#1E3A5F", fontFamily: "monospace" }}>{contract.contractNo}</span>
              <span style={{
                backgroundColor: (STATUS_COLOR[contract.status] ?? "#6b7280") + "20",
                color: STATUS_COLOR[contract.status] ?? "#6b7280",
                padding: "3px 12px", borderRadius: "99px", fontSize: "14px", fontWeight: 700,
              }}>{contract.status}</span>
              <DaysBadge days={contractDays} />
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
              🏢 {contract.customer.companyName}
            </div>
            {contract.serviceDesc && (
              <div style={{ color: "#6b7280", fontSize: "15px", maxWidth: "600px" }}>{contract.serviceDesc}</div>
            )}
          </div>

          {/* Right: Key dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: "15px" }}>
            {[
              { label: "เริ่มสัญญา", value: contract.startDate.toLocaleDateString("th-TH") },
              { label: "หมดสัญญา",  value: contract.endDate.toLocaleDateString("th-TH") },
              { label: "SLA",       value: contract.slaType.replace(/_/g, " ") },
              { label: "PO No",     value: contract.poNo ?? "—" },
              { label: "SO No",     value: contract.soNo ?? "—" },
              { label: "Items",     value: `${contract.items.length} รายการ` },
            ].map((r) => (
              <div key={r.label}>
                <div style={{ color: "#9ca3af", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{r.label}</div>
                <div style={{ color: "#1E3A5F", fontWeight: 600, marginTop: "1px" }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer quick info */}
      <div style={{ backgroundColor: "#eff6ff", borderRadius: "10px", padding: "14px 20px", marginBottom: "20px", display: "flex", gap: "32px", flexWrap: "wrap", fontSize: "15px" }}>
        <div><span style={{ color: "#6b7280" }}>ติดต่อ: </span><span style={{ fontWeight: 600 }}>{contract.customer.contactPerson ?? "—"}</span></div>
        <div><span style={{ color: "#6b7280" }}>โทร: </span><span style={{ fontWeight: 600 }}>{contract.customer.contactPhone ?? "—"}</span></div>
        <div><span style={{ color: "#6b7280" }}>Email: </span><span style={{ fontWeight: 600 }}>{contract.customer.contactEmail ?? "—"}</span></div>
        <div>
          <Link href={`/customers`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>
            ดูข้อมูลลูกค้า →
          </Link>
        </div>
      </div>

      <ContractItemsEditor contractId={contract.id} items={itemRows} assets={assetRows} />

      {/* Items table */}
      <div style={{ display: "none" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "17px" }}>
            📋 รายการ Items ({contract.items.length})
          </div>
          <div style={{ fontSize: "14px", color: "#9ca3af" }}>
            {assets.length > 0 && `🖥️ ${assets.length} Assets เชื่อมอยู่`}
          </div>
        </div>

        {contract.items.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>ไม่มี Items</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["#", "Part Number", "Description", "S/N หรือ Sub ID", "Type", "SLA", "Start", "End", "เหลือ", "Asset", "Remark"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "13px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contract.items.map((item, i) => {
                  const asset = item.serialNumber ? assetBySN.get(item.serialNumber.toLowerCase()) : undefined;
                  const itemDays = daysLeft(item.endDate);

                  return (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", color: "#9ca3af", fontWeight: 600, fontSize: "14px" }}>{item.sortOrder || i + 1}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#374151", whiteSpace: "nowrap" }}>
                        {item.partNumber ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", maxWidth: "260px" }}>
                        <div style={{ fontWeight: 600, color: "#1E3A5F", lineHeight: "1.4" }}>
                          {item.description?.split("\n")[0] ?? "—"}
                        </div>
                        {item.description?.includes("\n") && (
                          <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "2px" }}>
                            {item.description.split("\n").slice(1).join(" ")}
                          </div>
                        )}
                        {item.quantity && item.quantity > 1 && (
                          <div style={{ color: "#7c3aed", fontSize: "13px", marginTop: "2px" }}>
                            x{item.quantity} {item.unit ?? ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#374151" }}>
                        {item.serialNumber ?? <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          backgroundColor: (TYPE_COLOR[item.itemType] ?? "#6b7280") + "18",
                          color: TYPE_COLOR[item.itemType] ?? "#6b7280",
                          padding: "2px 8px", borderRadius: "99px", fontSize: "13px", fontWeight: 700,
                        }}>
                          {item.itemType}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {item.sla ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>
                        {item.startDate ? item.startDate.toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>
                        {item.endDate ? item.endDate.toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <DaysBadge days={itemDays} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {asset ? (
                          <Link href={`/assets?q=${encodeURIComponent(asset.serialNumber ?? asset.assetCode)}`} style={{ textDecoration: "none" }}>
                            <div style={{ backgroundColor: "#eff6ff", borderRadius: "6px", padding: "4px 8px", display: "inline-block" }}>
                              <div style={{ color: "#2563eb", fontWeight: 700, fontSize: "13px", fontFamily: "monospace" }}>{asset.assetCode}</div>
                              <div style={{ color: "#6b7280", fontSize: "13px" }}>{asset.brand} {asset.model}</div>
                            </div>
                          </Link>
                        ) : item.serialNumber ? (
                          <span style={{ color: "#f59e0b", fontSize: "13px" }}>⚠️ ไม่พบ Asset</span>
                        ) : (
                          <span style={{ color: "#d1d5db", fontSize: "13px" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "13px", maxWidth: "150px" }}>
                        {item.remark ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
        <Link href={backHref} style={{
          backgroundColor: "white", color: "#374151", border: "1px solid #e2e8f0",
          padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontSize: "16px", fontWeight: 600,
        }}>
          ← กลับรายการ
        </Link>
        <Link href={`/contracts/${contract.id}/print`} style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          backgroundColor: "#1E3A5F", color: "white",
          padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontSize: "16px", fontWeight: 600,
        }}>
          <Eye size={18} aria-hidden="true" />
          Preview / Print
        </Link>
        {assets.length > 0 && (
          <Link href={`/assets?customer=${encodeURIComponent(contract.customer.companyName)}`} style={{
            backgroundColor: "#7c3aed", color: "white",
            padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontSize: "16px", fontWeight: 600,
          }}>
            🖥️ ดู Assets ของลูกค้านี้
          </Link>
        )}
      </div>
    </div>
  );
}
