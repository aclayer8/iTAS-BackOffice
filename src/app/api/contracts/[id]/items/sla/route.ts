import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, notFound, ok, serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

const SlaBulkUpdateSchema = z.object({
  itemIds: z.array(z.string().cuid()).min(1).max(500),
  sla: z.enum(["8x5xNBD", "8x5x4", "24x7xNBD", "24x7x4", "Best Effort"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req, async (req) => {
    try {
      const { id: contractId } = await params;
      const body = await req.json();
      const parsed = SlaBulkUpdateSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest("Invalid item selection or SLA value.");
      }

      const contract = await prisma.contract.findFirst({
        where: { id: contractId, deletedAt: null },
        select: { id: true },
      });

      if (!contract) return notFound("Contract");

      const uniqueItemIds = Array.from(new Set(parsed.data.itemIds));
      const eligibleItems = await prisma.contractItem.findMany({
        where: {
          id: { in: uniqueItemIds },
          contractId,
        },
        select: { id: true },
      });

      if (eligibleItems.length !== uniqueItemIds.length) {
        return badRequest("One or more selected items do not belong to this contract.");
      }

      const result = await prisma.contractItem.updateMany({
        where: {
          id: { in: uniqueItemIds },
          contractId,
        },
        data: { sla: parsed.data.sla },
      });

      return ok({ updatedCount: result.count });
    } catch (error) {
      return serverError(error);
    }
  }, "contract:write");
}
