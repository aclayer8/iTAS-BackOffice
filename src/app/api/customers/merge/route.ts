import { NextRequest, NextResponse } from "next/server";
import { serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// POST /api/customers/merge
// Body: { sourceId, targetId }
// Moves all contracts, assets, sites, licenses, attachments from source -> target
// then soft-deletes the source customer.
const MergeCustomersSchema = z.object({
  sourceId: z.string().trim().min(1).max(100),
  targetId: z.string().trim().min(1).max(100),
});

async function mergeCustomers(req: NextRequest, userId: string) {
  try {
    const parsed = MergeCustomersSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "sourceId and targetId required" }, { status: 400 });
    }
    const { sourceId, targetId } = parsed.data;
    if (sourceId === targetId) {
      return NextResponse.json({ success: false, error: "Source and target must be different" }, { status: 400 });
    }

    const [source, target] = await Promise.all([
      prisma.customer.findFirst({ where: { id: sourceId, deletedAt: null } }),
      prisma.customer.findFirst({ where: { id: targetId, deletedAt: null } }),
    ]);
    if (!source) return NextResponse.json({ success: false, error: "Source customer not found" }, { status: 404 });
    if (!target) return NextResponse.json({ success: false, error: "Target customer not found" }, { status: 404 });

    const [contractCount, assetCount, siteCount, licenseCount] = await Promise.all([
      prisma.contract.count({ where: { customerId: sourceId, deletedAt: null } }),
      prisma.asset.count({ where: { customerId: sourceId } }),
      prisma.customerSite.count({ where: { customerId: sourceId } }),
      prisma.license.count({ where: { customerId: sourceId } }),
    ]);

    await prisma.$transaction(async (tx) => {
      // 1. Contracts
      await tx.contract.updateMany({
        where: { customerId: sourceId },
        data:  { customerId: targetId },
      });

      // 2. Assets
      await tx.asset.updateMany({
        where: { customerId: sourceId },
        data:  { customerId: targetId },
      });

      // 3. Sites
      await tx.customerSite.updateMany({
        where: { customerId: sourceId },
        data:  { customerId: targetId },
      });

      // 4. Licenses
      await tx.license.updateMany({
        where: { customerId: sourceId },
        data:  { customerId: targetId },
      });

      // 5. Attachments (polymorphic — uses entityType + entityId)
      await tx.attachment.updateMany({
        where: { entityType: "CUSTOMER", entityId: sourceId },
        data:  { entityId: targetId },
      });

      // 6. Tags — move tags that target does not already have
      const sourceTags  = await tx.customerTag.findMany({ where: { customerId: sourceId } });
      const targetTagIds = (await tx.customerTag.findMany({ where: { customerId: targetId } })).map(t => t.tagId);
      const newTags = sourceTags.filter(t => !targetTagIds.includes(t.tagId));
      if (newTags.length > 0) {
        await tx.customerTag.createMany({
          data: newTags.map(t => ({ customerId: targetId, tagId: t.tagId })),
        });
      }
      await tx.customerTag.deleteMany({ where: { customerId: sourceId } });

      // 7. Soft-delete source
      await tx.customer.update({
        where: { id: sourceId },
        data:  { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entityType: "customer",
          entityId: targetId,
          oldValues: { sourceId },
          newValues: { targetId },
          description: `Merged customer ${sourceId} into ${targetId}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      moved: { contracts: contractCount, assets: assetCount, sites: siteCount, licenses: licenseCount },
      targetId,
    });
  } catch (error) {
    console.error("[merge POST]", error);
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  return withAuth(req, mergeCustomers, "customer:delete");
}
