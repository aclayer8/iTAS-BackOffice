import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, notFound, ok, serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

const nullableText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null).nullable();

const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const ContractItemUpdateSchema = z.object({
  itemType: z.enum(["HARDWARE", "LICENSE", "SUBSCRIPTION", "SERVICE", "SUPPORT"]),
  partNumber: nullableText(100),
  description: nullableText(500),
  serialNumber: nullableText(100),
  quantity: z.number().int().positive().max(999999).nullable(),
  unit: nullableText(50),
  sla: nullableText(200),
  startDate: nullableDate,
  endDate: nullableDate,
  remark: nullableText(500),
  syncAsset: z.boolean().default(true),
  confirmSerialChange: z.boolean().default(false),
});

function toDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return withAuth(req, async (req) => {
    try {
      const { id: contractId, itemId } = await params;
      const body = await req.json();
      const parsed = ContractItemUpdateSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest("Invalid contract item data.");
      }

      const data = parsed.data;
      const startDate = toDate(data.startDate);
      const endDate = toDate(data.endDate);

      if (startDate && endDate && endDate < startDate) {
        return badRequest("End date must be on or after start date.");
      }

      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.contractItem.findFirst({
          where: { id: itemId, contractId },
        });

        if (!item) return { status: "not_found" as const };

        const serialChanged = (item.serialNumber ?? "") !== (data.serialNumber ?? "");
        if (serialChanged && !data.confirmSerialChange) {
          return { status: "serial_confirmation_required" as const };
        }

        let linkedAsset = item.warrantyRef
          ? await tx.asset.findFirst({ where: { id: item.warrantyRef, deletedAt: null } })
          : null;

        if (!linkedAsset && item.serialNumber) {
          linkedAsset = await tx.asset.findFirst({
            where: {
              serialNumber: { equals: item.serialNumber, mode: "insensitive" },
              deletedAt: null,
            },
          });
        }

        if (serialChanged && data.serialNumber) {
          const assetWithNewSerial = await tx.asset.findFirst({
            where: {
              serialNumber: { equals: data.serialNumber, mode: "insensitive" },
              deletedAt: null,
            },
          });

          if (assetWithNewSerial && linkedAsset && assetWithNewSerial.id !== linkedAsset.id) {
            return { status: "serial_conflict" as const, assetCode: assetWithNewSerial.assetCode };
          }

          if (!linkedAsset && assetWithNewSerial) {
            linkedAsset = assetWithNewSerial;
          }
        }

        const updatedItem = await tx.contractItem.update({
          where: { id: item.id },
          data: {
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
            warrantyRef: linkedAsset?.id ?? item.warrantyRef,
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
              ...(serialChanged && data.serialNumber
                ? { serialNumber: data.serialNumber }
                : {}),
              ...(!linkedAsset.installDate && startDate ? { installDate: startDate } : {}),
            },
          });
          assetSynced = true;
        }

        return {
          status: "updated" as const,
          itemId: updatedItem.id,
          assetSynced,
          linkedAssetCode: linkedAsset?.assetCode ?? null,
        };
      });

      if (result.status === "not_found") return notFound("Contract item");
      if (result.status === "serial_confirmation_required") {
        return badRequest("Serial number changed. Please confirm before saving.");
      }
      if (result.status === "serial_conflict") {
        return badRequest(`Serial number already belongs to asset ${result.assetCode}. Review the asset link before saving.`);
      }

      return ok({
        itemId: result.itemId,
        assetSynced: result.assetSynced,
        linkedAssetCode: result.linkedAssetCode,
      });
    } catch (error) {
      return serverError(error);
    }
  }, "contract:write");
}
