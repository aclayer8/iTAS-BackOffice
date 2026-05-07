import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981", WARRANTY_EXPIRED: "#f59e0b", EOS: "#f97316",
  EOL: "#ef4444", DECOMMISSIONED: "#6b7280", IN_STORAGE: "#8b5cf6", REPLACED: "#9ca3af",
};
const TYPE_ICON: Record<string, string> = {
  FIREWALL: "🔥", SWITCH: "🔀", WIRELESS_AP: "📡", SERVER: "🖥️",
  STORAGE: "💾", UPS: "🔋", ROUTER: "🌐", LOAD_BALANCER: "⚖️", OTHER: "📦",
};

function daysLeft(end: Date | null) {
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}
function warrantyBadge(end: Date | null) {
  const d = daysLeft(end);
  if (d === null) return { label: "—", color: "#9ca3af" };
  if (d < 0)    return { label: `หมดแล้ว ${Math.abs(d)} วัน`, color: "#ef4444" };
  if (d <= 30)  return { label: `เหลือ ${d} วัน ⚠️`, color: "#f97316" };
  if (d <= 90)  return { label: `เหลือ ${d} วัน`, color: "#f59e0b" };
  return { label: `เหลือ ${d} วัน`, color: "#10b981" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return <SearchLayout query="" assetResults={[]} contractItemResults={[]} customerResults={[]} />;
  }

  // ── Asset search: by serial, assetCode, brand, model, partNumber ──────────
  const assetResults = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      OR: [
        { serialNumber: { contains: query, mode: "insensitive" } },
        { assetCode:    { contains: query, mode: "insensitive" } },
        { brand:        { contains: query, mode: "insensitive" } },
        { model:        { contains: query, mode: "insensitive" } },
        { partNumber:   { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      customer:      { select: { companyName: true } },
      site:          { select: { siteName: true } },
      engineerOwner: { select: { name: true } },
    },
    take: 30,
  });

  // ── Contract Item search: by serial, partNumber, description ─────────────
  const contractItemResults = await prisma.contractItem.findMany({
    where: {
      OR: [
        { serialNumber: { contains: query, mode: "insensitive" } },
        { partNumber:   { contains: query, mode: "insensitive" } },
        { description:  { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      contract: {
        select: {
          contractNo: true, status: true, endDate: true,
          customer: { select: { companyName: true } },
        },
      },
    },
    take: 30,
  });

  // ── Customer search: by company name, taxId ───────────────────────────────
  const customerResults = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      OR: [
        { companyName: { contains: query, mode: "insensitive" } },
        { shortName:   { contains: query, mode: "insensitive" } },
        { taxId:       { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      _count: { select: { assets: true, contracts: true } },
    },
    take: 10,
  });

  return (
    <SearchLayout
      query={query}
      assetResults={assetResults as AssetResult[]}
      contractItemResults={contractItemResults as ContractItemResult[]}
      customerResults={customerResults as CustomerResult[]}
    />
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AssetResult {
  id: string; assetCode: string; brand: string; model: string;
  serialNumber: string | null; assetType: string; lifecycleStatus: string;
  warrantyEnd: Date | null; partNumber: string | null;
  customer: { companyName: string };
  site: { siteName: string } | null;
  engineerOwner: { name: string } | null;
}
interface ContractItemResult {
  id: string; partNumber: string | null; description: string | null;
  serialNumber: string | null; sla: string | null; startDate: Date | null; endDate: Date | null;
  contract: { contractNo: string; status: string; endDate: Date; customer: { companyName: string } };
}
interface CustomerResult {
  id: string; companyName: string; shortName: string | null;
  status: string; contactPerson: string | null; contactPhone: string | null;
  _count: { assets: number; contracts: number };
}

// ── Layout ────────────────────────────────────────────────────────────────────
function SearchLayout({
  query, assetResults, contractItemResults, customerResults,
}: {
  query: string;
  assetResults: AssetResult[];
  contractItemResults: ContractItemResult[];
  customerResults: CustomerResult[];
}) {
  const total = assetResults.length + contractItemResults.length + customerResults.length;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "32px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <Link href="/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "16px" }}>
          ← Dashboard
        </Link>
        <h1 style={{ margin: "8px 0 4px", color: "#1E3A5F", fontSize: "26px" }}>🔍 ค้นหาข้อมูล</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>
          ค้นหาด้วย Serial Number, Asset Code, ชื่อลูกค้า, Part Number, Brand/Model
        </p>
      </div>

      {/* Search Box */}
      <form method="GET" action="/search" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", gap: "10px", maxWidth: "600px" }}>
          <input
            name="q"
            defaultValue={query}
            placeholder="พิมพ์ Serial Number, ชื่อลูกค้า, Part No..."
            autoFocus
            style={{
              flex: 1, padding: "12px 16px", borderRadius: "10px",
              border: "2px solid #1E3A5F", fontSize: "17px",
              outline: "none", fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#1E3A5F", color: "white", border: "none",
              padding: "12px 28px", borderRadius: "10px", cursor: "pointer",
              fontSize: "17px", fontWeight: "bold",
            }}
          >
            ค้นหา
          </button>
        </div>
      </form>

      {/* Results summary */}
      {query && (
        <p style={{ color: "#6b7280", fontSize: "16px", marginBottom: "20px" }}>
          ค้นหา <strong>&quot;{query}&quot;</strong> — พบ {total} รายการ
          {total === 0 && " (ไม่พบข้อมูลที่ตรงกัน)"}
        </p>
      )}

      {/* Assets */}
      {assetResults.length > 0 && (
        <Section title={`🖥️ Assets (${assetResults.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
              <thead>
                <tr style={{ backgroundColor: "#1E3A5F", color: "white" }}>
                  {["Type", "Asset Code", "Brand / Model", "Serial No.", "Part No.", "ลูกค้า", "Site", "วันหมดประกัน", "สถานะประกัน", "วิศวกร", "สถานะ"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assetResults.map((a, i) => {
                  const wb = warrantyBadge(a.warrantyEnd);
                  return (
                    <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontSize: "20px" }}>{TYPE_ICON[a.assetType] ?? "📦"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#2563EB", fontFamily: "monospace", fontSize: "14px" }}>{a.assetCode}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{a.brand}</div>
                        <div style={{ color: "#6b7280", fontSize: "14px" }}>{a.model}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "14px" }}>
                        {a.serialNumber
                          ? <span style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px" }}>{a.serialNumber}</span>
                          : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "13px", color: "#6b7280" }}>{a.partNumber ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{a.customer.companyName}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: "14px" }}>{a.site?.siteName ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: "14px" }}>
                        {a.warrantyEnd ? a.warrantyEnd.toLocaleDateString("th-TH") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ color: wb.color, fontWeight: "bold", fontSize: "14px" }}>{wb.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px", color: "#6b7280" }}>
                        {a.engineerOwner?.name ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          backgroundColor: (STATUS_COLOR[a.lifecycleStatus] ?? "#9ca3af") + "20",
                          color: STATUS_COLOR[a.lifecycleStatus] ?? "#9ca3af",
                          padding: "2px 8px", borderRadius: "99px", fontSize: "13px", fontWeight: "bold"
                        }}>
                          {a.lifecycleStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Contract Items */}
      {contractItemResults.length > 0 && (
        <Section title={`📋 รายการในสัญญา (${contractItemResults.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
              <thead>
                <tr style={{ backgroundColor: "#7c3aed", color: "white" }}>
                  {["ลูกค้า", "Contract No.", "Part Number", "รายละเอียด", "Serial No.", "SLA", "เริ่ม", "สิ้นสุด", "สถานะสัญญา"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractItemResults.map((item, i) => {
                  const days = daysLeft(item.endDate);
                  const dayColor = days === null ? "#6b7280" : days < 0 ? "#ef4444" : days <= 30 ? "#f97316" : days <= 90 ? "#f59e0b" : "#10b981";
                  return (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.contract.customer.companyName}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed", fontFamily: "monospace", fontSize: "14px" }}>{item.contract.contractNo}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "14px", color: "#6b7280" }}>{item.partNumber ?? "—"}</td>
                      <td style={{ padding: "10px 12px", maxWidth: "250px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.description ?? ""}>
                          {item.description ?? "—"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "14px" }}>
                        {item.serialNumber
                          ? <span style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px" }}>{item.serialNumber}</span>
                          : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "14px" }}>{item.sla ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: "14px" }}>{item.startDate ? new Date(item.startDate).toLocaleDateString("th-TH") : "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: "14px" }}>
                        <span style={{ color: dayColor, fontWeight: "bold" }}>
                          {item.endDate ? new Date(item.endDate).toLocaleDateString("th-TH") : "—"}
                          {days !== null && <span style={{ fontSize: "13px", marginLeft: "4px" }}>({days < 0 ? `${Math.abs(days)}d ago` : `${days}d`})</span>}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: item.contract.status === "ACTIVE" ? "#10b981" : "#6b7280" }}>
                          {item.contract.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Customers */}
      {customerResults.length > 0 && (
        <Section title={`🏢 ลูกค้า (${customerResults.length})`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {customerResults.map((c) => (
              <div key={c.id} style={{
                backgroundColor: "white", borderRadius: "10px", padding: "16px",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.06)"
              }}>
                <div style={{ fontWeight: 700, color: "#1E3A5F", fontSize: "16px", marginBottom: "4px" }}>{c.companyName}</div>
                {c.shortName && <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "6px" }}>{c.shortName}</div>}
                {c.contactPerson && <div style={{ fontSize: "15px", marginBottom: "2px" }}>👤 {c.contactPerson}</div>}
                {c.contactPhone && <div style={{ fontSize: "15px", color: "#6b7280" }}>📞 {c.contactPhone}</div>}
                <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "14px" }}>
                  <span>🖥️ {c._count.assets} assets</span>
                  <span>📄 {c._count.contracts} contracts</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* No results */}
      {query && total === 0 && (
        <div style={{
          backgroundColor: "white", borderRadius: "12px", padding: "40px",
          textAlign: "center", color: "#6b7280", boxShadow: "0 1px 3px rgba(0,0,0,.1)"
        }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>ไม่พบข้อมูล</div>
          <div style={{ fontSize: "16px" }}>ลองค้นหาด้วย Serial Number, ชื่อลูกค้า, หรือ Part Number</div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{ color: "#1E3A5F", fontSize: "18px", marginBottom: "12px", fontWeight: 700 }}>{title}</h2>
      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,.1)", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
