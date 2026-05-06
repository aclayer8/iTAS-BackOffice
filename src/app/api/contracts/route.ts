// =============================================================
// iTAS BackOffice — Contracts API Route
// GET  /api/contracts  → List (paginated + filtered)
// POST /api/contracts  → Create (auto contract number)
// =============================================================

import { NextRequest } from "next/server";
import {
  withAuth,
  ok,
  created,
  badRequest,
  serverError,
  parsePagination,
  paginatedResponse,
  notDeleted,
  createAuditLog,
} from "@/lib/api-helpers";
import { generateContractNumber } from "@/lib/contract-number";
import { ContractSchema } from "@/utils/validators";
import prisma from "@/lib/prisma";
import type { UserRole } from "@/types";

// ---- GET /api/contracts ----

export async function GET(req: NextRequest) {
  return withAuth(req, async (req, userId, role) => {
    try {
      const url = new URL(req.url);
      const { skip, take, page, limit } = parsePagination(req);

      // Filters from query params
      const status   = url.searchParams.get("status");
      const customer = url.searchParams.get("customerId");
      const vendor   = url.searchParams.get("vendorId");
      const search   = url.searchParams.get("search");
      const expiring = url.searchParams.get("expiring"); // "30" | "60" | "90"

      const where: Record<string, unknown> = { ...notDeleted };

      if (status)   where.status = status;
      if (customer) where.customerId = customer;
      if (vendor)   where.vendorId = vendor;

      if (expiring) {
        const days = parseInt(expiring, 10);
        const future = new Date();
        future.setDate(future.getDate() + days);
        where.endDate = { lte: future };
        where.status = { in: ["ACTIVE", "PENDING_RENEWAL"] };
      }

      if (search) {
        where.OR = [
          { contractNo:   { contains: search, mode: "insensitive" } },
          { soNo:         { contains: search, mode: "insensitive" } },
          { poNo:         { contains: search, mode: "insensitive" } },
          { quotationNo:  { contains: search, mode: "insensitive" } },
          { serviceDesc:  { contains: search, mode: "insensitive" } },
          { customer: { companyName: { contains: search, mode: "insensitive" } } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.contract.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { id: true, companyName: true, shortName: true } },
            site:     { select: { id: true, siteName: true } },
            vendor:   { select: { id: true, name: true, shortName: true } },
            createdBy:{ select: { id: true, name: true } },
            _count: { select: { items: true, renewals: true } },
          },
        }),
        prisma.contract.count({ where }),
      ]);

      return ok(paginatedResponse(data, total, page, limit));
    } catch (error) {
      return serverError(error);
    }
  }, "contract:read");
}

// ---- POST /api/contracts ----

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, userId, role) => {
    try {
      const body = await req.json();
      const parsed = ContractSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest(parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
      }

      const data = parsed.data;

      // Validate date range
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        return badRequest("End date must be after start date");
      }

      // Auto-generate contract number
      const contractNo = await generateContractNumber();

      const contract = await prisma.$transaction(async (tx) => {
        const contract = await tx.contract.create({
          data: {
            contractNo,
            soNo:        data.soNo,
            poNo:        data.poNo,
            quotationNo: data.quotationNo,
            customerId:  data.customerId,
            siteId:      data.siteId,
            vendorId:    data.vendorId,
            createdById: userId,
            serviceDesc: data.serviceDesc,
            startDate:   new Date(data.startDate),
            endDate:     new Date(data.endDate),
            slaType:     data.slaType,
            supportType: data.supportType,
            status:      data.status,
            autoRenew:   data.autoRenew,
            totalValue:  data.totalValue,
            currency:    data.currency,
            remark:      data.remark,
          },
          include: {
            customer: { select: { id: true, companyName: true } },
            site:     { select: { id: true, siteName: true } },
            vendor:   { select: { id: true, name: true } },
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: "CREATE",
            entityType: "contract",
            entityId: contract.id,
            newValues: { contractNo, customerId: data.customerId },
            description: `Created contract ${contractNo}`,
          },
        });

        // Activity log for customer
        await tx.activityLog.create({
          data: {
            userId,
            entityType: "contract",
            entityId: contract.id,
            action: "Contract Created",
            description: `Contract ${contractNo} created`,
          },
        });

        return contract;
      });

      return created(contract);
    } catch (error) {
      return serverError(error);
    }
  }, "contract:write");
}
