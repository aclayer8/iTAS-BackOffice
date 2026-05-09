import { NextRequest } from "next/server";
import { withAuth, ok, serverError } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

// GET /api/notifications
export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return ok(notifications);
    } catch (err) {
      return serverError(err);
    }
  });
}
