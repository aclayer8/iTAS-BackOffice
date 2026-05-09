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
import { LicenseSchema } from "@/utils/validators";
import prisma from "@/lib/prisma";

// GET /api/licenses
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const { skip, take, page, limit } = parsePagination(req);

      const [data, total] = await Promise.all([
        prisma.license.findMany({
          where: notDeleted,
          skip, take,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { id: true, companyName: true } },
            site:     { select: { id: true, siteName: true } },
          },
        }),
        prisma.license.count({ where: notDeleted }),
      ]);

      return ok(paginatedResponse(data, total, page, limit));
    } catch (err) {
      return serverError(err);
    }
  }, "license:read");
}

// POST /api/licenses
export async function POST(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const body = await req.json();
      const parsed = LicenseSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest(
          parsed.error.errors.map((e) => [e.path.join("."), e.message].join(": ")).join(", ")
        );
      }

      const license = await prisma.license.create({ data: parsed.data as any });
      return created(license);
    } catch (err) {
      return serverError(err);
    }
  }, "license:write");
}
