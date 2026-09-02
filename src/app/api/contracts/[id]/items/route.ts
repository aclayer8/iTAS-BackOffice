import { NextRequest } from "next/server";
import { badRequest, created, notFound, serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import {
  ContractItemInputSchema,
  contractItemAuditValues,
  hasInvalidDateRange,
  toDate,
} from "./validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req, async (req, userId) => {
    try {
      const { id: contractId } = await params;
      const parsed = ContractItemInputSchema.safeParse(await req.json());

      if (!parsed.success) {
        return badRequest("Invalid contract item data.");
      }

      const data = parsed.data;
      const startDate = toDate(data.startDate);
      const endDate = toDate(data.endDate);

      if (hasInvalidDateRange(startDate, endDate)) {
        return badRequest("End date must be on or after start date.");
      }

      const result = await prisma.$transaction(async (tx) => {
        const contract = await tx.contract.findFirst({
          where: { id: contractId, deletedAt: null },
          select: { id: true, contractNo: true },
        });

        if (!contract) return { status: "not_found" as const };

        const [lastItem, linkedAsset] = await Promise.all([
          tx.contractItem.aggregate({
            where: { contractId },
            _max: { sortOrder: true },
            _count: { _all: true },
          }),
          data.serialNumber
            ? tx.asset.findFirst({
                where: {
                  serialNumber: { equals: data.serialNumber, mode: "insensitive" },
                  deletedAt: null,
                },
              })
            : null,
        ]);

        const item = await tx.contractItem.create({
          data: {
            contractId,
            itemType: data.itemType,
            partNumber: data.partNumber,
            description: data.description,
            serialNumber: data.serialNumber,
            quantity: data.quantity,
            unit: data.unit,
            sla: data.sla,
            startDate,
            endDate,
            remark: data.remark,
            warrantyRef: linkedAsset?.id ?? null,
            sortOrder: Math.max(lastItem._max.sortOrder ?? 0, lastItem._count._all) + 1,
          },
        });

        let assetSynced = false;
        if (data.syncAsset && linkedAsset) {
          await tx.asset.update({
            where: { id: linkedAsset.id },
            data: {
              partNumber: data.partNumber,
              warrantyStart: startDate,
              warrantyEnd: endDate,
              ...(!linkedAsset.installDate && startDate ? { installDate: startDate } : {}),
            },
          });
          assetSynced = true;
        }

        await Promise.all([
          tx.contract.update({
            where: { id: contractId },
            data: { version: { increment: 1 } },
          }),
          tx.auditLog.create({
            data: {
              userId,
              action: "CREATE",
              entityType: "contract_item",
              entityId: item.id,
              newValues: contractItemAuditValues(item),
              description: `Added item ${item.sortOrder} to contract ${contract.contractNo}`,
            },
          }),
        ]);

        return {
          status: "created" as const,
          itemId: item.id,
          assetSynced,
          linkedAssetCode: linkedAsset?.assetCode ?? null,
        };
      });

      if (result.status === "not_found") return notFound("Contract");

      return created({
        itemId: result.itemId,
        assetSynced: result.assetSynced,
        linkedAssetCode: result.linkedAssetCode,
      });
    } catch (error) {
      return serverError(error);
    }
  }, "contract:write");
}
