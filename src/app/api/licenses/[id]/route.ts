import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { badRequest, createAuditLog, notFound, ok, serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { LicenseSchema } from "@/utils/validators";

const EditableLicenseSchema = LicenseSchema.pick({
  licenseName: true,
  vendor: true,
  product: true,
  edition: true,
  quantity: true,
  unit: true,
  startDate: true,
  endDate: true,
  renewalStatus: true,
  note: true,
});

function auditValues(license: {
  licenseName: string;
  vendor: string | null;
  product: string | null;
  edition: string | null;
  quantity: number | null;
  unit: string | null;
  startDate: Date | null;
  endDate: Date | null;
  renewalStatus: string;
  note: string | null;
}) {
  return {
    licenseName: license.licenseName,
    vendor: license.vendor,
    product: license.product,
    edition: license.edition,
    quantity: license.quantity,
    unit: license.unit,
    startDate: license.startDate?.toISOString() ?? null,
    endDate: license.endDate?.toISOString() ?? null,
    renewalStatus: license.renewalStatus,
    note: license.note,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (request, userId) => {
    try {
      const { id } = await params;
      const parsed = EditableLicenseSchema.safeParse(await request.json());
      if (!parsed.success) {
        return badRequest(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(", "));
      }

      const data = parsed.data;
      const startDate = data.startDate ? new Date(data.startDate) : null;
      const endDate = data.endDate ? new Date(data.endDate) : null;
      if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime()))) {
        return badRequest("Invalid license date");
      }
      if (startDate && endDate && endDate <= startDate) {
        return badRequest("License end date must be after start date");
      }

      const existing = await prisma.license.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return notFound("License");

      const updateData: Prisma.LicenseUpdateInput = {
        licenseName: data.licenseName,
        vendor: data.vendor,
        product: data.product,
        edition: data.edition,
        quantity: data.quantity,
        unit: data.unit,
        startDate,
        endDate,
        renewalStatus: data.renewalStatus,
        note: data.note,
      };
      const license = await prisma.license.update({ where: { id }, data: updateData });

      await createAuditLog({
        userId,
        action: "UPDATE",
        entityType: "license",
        entityId: license.id,
        oldValues: auditValues(existing),
        newValues: auditValues(license),
        description: "Updated contract license",
        req: request,
      });

      return ok(license);
    } catch (error) {
      return serverError(error);
    }
  }, "license:write");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (request, userId) => {
    try {
      const { id } = await params;
      const existing = await prisma.license.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return notFound("License");

      const deletedAt = new Date();
      await prisma.license.update({ where: { id }, data: { deletedAt } });
      await createAuditLog({
        userId,
        action: "DELETE",
        entityType: "license",
        entityId: existing.id,
        oldValues: auditValues(existing),
        newValues: { deletedAt: deletedAt.toISOString() },
        description: "Removed license from contract",
        req: request,
      });

      return ok({ id: existing.id });
    } catch (error) {
      return serverError(error);
    }
  }, "license:delete");
}
