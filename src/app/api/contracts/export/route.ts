import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import type { UserRole } from "@/types";
import { contractCsvCell, contractDate, contractListSelect, contractListWhere, parseContractListParams, prepareContractList } from "@/lib/contract-list";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "contract:export")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = request.nextUrl.searchParams;
  const format = params.get("format") || "csv";
  if (!["csv", "xlsx"].includes(format)) return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  const selected = params.has("selected") ? params.get("selected")!.split(",") : null;
  if (selected && (!selected.length || selected.length > 50 || selected.some(id => !/^[a-zA-Z0-9_-]{1,100}$/.test(id)))) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }
  try {
    const filters = parseContractListParams(Object.fromEntries(params));
    const now = new Date();
    const records = await prisma.contract.findMany({
      where: { ...contractListWhere(filters, now), ...(selected ? { id: { in: selected } } : {}) },
      select: contractListSelect,
    });
    const { matching } = prepareContractList(records, filters, now);
    const headers = ["Contract No.", "Customer", "Project", "Start Date", "End Date", "Assets", "Status", "Days Remaining"];
    const rows = matching.map(row => [row.contractNo, row.customer, row.project, contractDate(row.startDate), contractDate(row.endDate), row.assets, row.label, row.days]);
    await prisma.auditLog.create({ data: {
      userId: session.user.id, action: "EXPORT", entityType: "contract",
      description: `Exported contract list (${format}, ${rows.length} records)`,
    } });
    const responseHeaders = {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="contracts_${now.toISOString().slice(0, 10)}.${format}"`,
    };
    if (format === "csv") {
      const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(contractCsvCell).join(",")).join("\r\n");
      return new NextResponse(csv, { headers: { ...responseHeaders, "Content-Type": "text/csv; charset=utf-8" } });
    }
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    sheet["!cols"] = [22, 42, 48, 16, 16, 10, 22, 18].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, "Contracts");
    return new NextResponse(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), {
      headers: { ...responseHeaders, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to export contracts" }, { status: 500 });
  }
}
