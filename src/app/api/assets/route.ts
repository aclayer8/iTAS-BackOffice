// =============================================================
// iTAS BackOffice — Assets API Route
// GET  /api/assets  → List (paginated + filtered)
// POST /api/assets  → Create (auto asset code)
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
} from "@/lib/api-helpers";
import { generateAssetCode } from "@/lib/contract-number";
import { AssetSchema } from "@/utils/validators";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const url = new URL(req.url);
      const { skip, take, page, limit } = parsePagination(req);

      const customerId = url.searchParams.get("customerId");
      const siteId     = url.searchParams.get("siteId");
      const assetType  = url.searchParams.get("assetType");
      const lifecycle  = url.searchParams.get("lifecycleStatus");
      const search     = url.searchParams.get("search");
      const expiring   = url.searchParams.get("warrantyExpiring"); // days

      const where: Record<string, unknown> = { ...notDeleted };

      if (customerId) where.customerId = customerId;
      if (siteId)     where.siteId     = siteId;
      if (assetType)  where.assetType  = assetType;
      if (lifecycle)  where.lifecycleStatus = lifecycle;

      if (expiring) {
        const days = parseInt(expiring, 10);
        const future = new Date();
        future.setDate(future.getDate() + days);
        where.warrantyEnd = { lte: future, gte: new Date() };
      }

      if (search) {
        where.OR = [
          { assetCode:    { contains: search, mode: "insensitive" } },
          { serialNumber: { contains: search, mode: "insensitive" } },
          { model:        { contains: search, mode: "insensitive" } },
          { brand:        { contains: search, mode: "insensitive" } },
          { ipAddress:    { contains: search, mode: "insensitive" } },
          { partNumber:   { contains: search, mode: "insensitive" } },
          { customer: { companyName: { contains: search, mode: "insensitive" } } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            customer:     { select: { id: true, companyName: true, shortName: true } },
            site:         { select: { id: true, siteName: true } },
            engineerOwner:{ select: { id: true, name: true } },
            vendor:       { select: { id: true, name: true, shortName: true } },
            tags:         { include: { tag: true } },
          },
        }),
        prisma.asset.count({ where }),
      ]);

      return ok(paginatedResponse(data, total, page, limit));
    } catch (error) {
      return serverError(error);
    }
  }, "asset:read");
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, userId) => {
    try {
      const body = await req.json();
      const parsed = AssetSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
      }

      const data = parsed.data;
      const assetCode = await generateAssetCode();

      const asset = await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
          data: {
            assetCode,
            brand:           data.brand,
            model:           data.model,
            serialNumber:    data.serialNumber,
            assetType:       data.assetType,
            customerId:      data.customerId,
            siteId:          data.siteId,
            engineerOwnerId: data.engineerOwnerId,
            installDate:     data.installDate ? new Date(data.installDate) : undefined,
            warrantyStart:   data.warrantyStart ? new Date(data.warrantyStart) : undefined,
            warrantyEnd:     data.warrantyEnd ? new Date(data.warrantyEnd) : undefined,
            vendorId:        data.vendorId,
            partNumber:      data.partNumber,
            lifecycleStatus: data.lifecycleStatus,
            rackLocation:    data.rackLocation,
            ipAddress:       data.ipAddress || undefined,
            macAddress:      data.macAddress || undefined,
            firmwareVersion: data.firmwareVersion,
            osVersion:       data.osVersion,
            purchasePrice:   data.purchasePrice,
            purchaseDate:    data.purchaseDate ? new Date(data.purchaseDate) : undefined,
            poNumber:        data.poNumber,
            note:            data.note,
          },
        });

        // Initial history event
        await tx.assetHistory.create({
          data: {
            assetId:     asset.id,
            event:       "INSTALLED",
            description: "Asset registered in system",
            performedBy: userId,
            eventDate:   data.installDate ? new Date(data.installDate) : new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "CREATE",
            entityType: "asset",
            entityId: asset.id,
            newValues: { assetCode, brand: data.brand, model: data.model },
            description: `Created asset ${assetCode}`,
          },
        });

        return asset;
      });

      return created(asset);
    } catch (error) {
      return serverError(error);
    }
  }, "asset:write");
}
