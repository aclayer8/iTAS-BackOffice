import { NextRequest } from "next/server";
import {
  withAuth,
  ok,
  badRequest,
  notFound,
  serverError,
  notDeleted,
} from "@/lib/api-helpers";
import { CustomerSchema } from "@/utils/validators";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/customers/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    try {
      const { id } = await params;
      const customer = await prisma.customer.findFirst({
        where: { id, ...notDeleted },
      });
      if (!customer) return notFound("Customer");
      return ok(customer);
    } catch (err) {
      return serverError(err);
    }
  }, "customer:read");
}

// PATCH /api/customers/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req) => {
    try {
      const { id } = await params;
      const body = await req.json();

      const parsed = CustomerSchema.partial().safeParse(body);
      if (!parsed.success) {
        return badRequest(
          parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        );
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: parsed.data,
      });

      return ok(customer);
    } catch (err) {
      return serverError(err);
    }
  }, "customer:write");
}

// DELETE /api/customers/[id]  (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    try {
      const { id } = await params;
      await prisma.customer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return ok({ id });
    } catch (err) {
      return serverError(err);
    }
  }, "customer:delete");
}
