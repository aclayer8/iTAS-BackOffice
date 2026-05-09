// POST /api/admin/reset-data
// Clears all contract/asset/customer/notification data (keeps Users)
// For development / re-import use only -- ADMIN role required

import { NextRequest } from "next/server";
import { withAuth, ok, serverError } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId, role) => {
    if (role !== "ADMIN") {
      return serverError("Forbidden -- ADMIN only");
    }

    try {
      const [notif, items, assets, contracts, customers] = await prisma.$transaction([
        prisma.notification.deleteMany({}),
        prisma.contractItem.deleteMany({}),
        prisma.asset.deleteMany({}),
        prisma.contract.deleteMany({}),
        prisma.customer.deleteMany({}),
      ]);

      return ok({
        deleted: {
          notifications: notif.count,
          contractItems: items.count,
          assets: assets.count,
          contracts: contracts.count,
          customers: customers.count,
        },
        message: "All data cleared successfully -- Users retained",
      });
    } catch (err) {
      return serverError(err);
    }
  }, "settings:write");
}
