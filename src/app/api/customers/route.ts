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
import { CustomerSchema } from "@/utils/validators";
import prisma from "@/lib/prisma";

// GET /api/customers
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const url = new URL(req.url);
      const { skip, take, page, limit } = parsePagination(req);
      const search = url.searchParams.get("search") ?? "";

      const where = {
        ...notDeleted,
        ...(search ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { shortName:   { contains: search, mode: "insensitive" as const } },
            { taxId:       { contains: search, mode: "insensitive" as const } },
          ],
        } : {}),
      };

      const [data, total] = await Promise.all([
        prisma.customer.findMany({
          where, skip, take,
          orderBy: { companyName: "asc" },
          include: {
            _count: { select: { sites: true, contracts: true, assets: true } },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      return ok(paginatedResponse(data, total, page, limit));
    } catch (err) {
      return serverError(err);
    }
  }, "customer:read");
}

// POST /api/customers
export async function POST(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const body = await req.json();
      const parsed = CustomerSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest(
          parsed.error.errors.map((e) => [e.path.join("."), e.message].join(": ")).join(", ")
        );
      }

      const customer = await prisma.customer.create({ data: parsed.data as any });
      return created(customer);
    } catch (err) {
      return serverError(err);
    }
  }, "customer:write");
}
