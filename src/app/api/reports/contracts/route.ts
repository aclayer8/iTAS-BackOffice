// =============================================================
// iTAS BackOffice — Contract Expiration Report API
// GET /api/reports/contracts?format=xlsx|csv|json
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import type { UserRole } from "@/types";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user as { role: UserRole };
  if (!hasPermission(role, "report:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const format   = url.searchParams.get("format") ?? "json";
  const expiring = url.searchParams.get("expiring"); // "30" | "60" | "90"
  const status   = url.searchParams.get("status");

  const now = new Date();
  const where: Record<string, unknown> = { deletedAt: null };

  if (status) {
    where.status = status;
  }

  if (expiring) {
    const days = parseInt(expiring, 10);
    const future = new Date(now);
    future.setDate(future.getDate() + days);
    where.endDate = { lte: future, gte: now };
    where.status = { in: ["ACTIVE", "PENDING_RENEWAL"] };
  }

  const contracts = await prisma.contract.findMany({
    where,
    orderBy: { endDate: "asc" },
    include: {
      customer: { select: { companyName: true, contactEmail: true, contactPerson: true } },
      site:     { select: { siteName: true } },
      vendor:   { select: { name: true } },
      _count:   { select: { items: true } },
    },
  });

  // Build report rows
  const rows = contracts.map((c) => {
    const daysRemaining = Math.ceil(
      (new Date(c.endDate).getTime() - now.getTime()) / 86400000
    );
    return {
      "Contract No":       c.contractNo,
      "SO No":             c.soNo ?? "",
      "PO No":             c.poNo ?? "",
      "Customer":          c.customer.companyName,
      "Contact Person":    c.customer.contactPerson ?? "",
      "Contact Email":     c.customer.contactEmail ?? "",
      "Site":              c.site?.siteName ?? "",
      "Vendor":            c.vendor?.name ?? "",
      "SLA":               c.slaType,
      "Support Type":      c.supportType,
      "Start Date":        c.startDate.toLocaleDateString("en-GB"),
      "End Date":          c.endDate.toLocaleDateString("en-GB"),
      "Days Remaining":    daysRemaining,
      "Status":            daysRemaining < 0 ? "EXPIRED" : c.status,
      "Auto Renew":        c.autoRenew ? "Yes" : "No",
      "Items Count":       c._count.items,
      "Total Value (THB)": c.totalValue?.toString() ?? "",
    };
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId:     (session.user as { id: string }).id,
      action:     "EXPORT",
      entityType: "report",
      description: `Exported contract report (${format}, ${contracts.length} records)`,
    },
  });

  if (format === "json") {
    return NextResponse.json({ success: true, data: rows, total: rows.length });
  }

  if (format === "csv") {
    const headers = Object.keys(rows[0] ?? {});
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(",")
      ),
    ];
    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contracts_report_${now.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows);

    // Style header row
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cell]) {
        ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: "1E3A5F" } } };
      }
    }

    // Auto column widths
    ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contracts");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="contracts_report_${now.toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format. Use json, csv, or xlsx" }, { status: 400 });
}
