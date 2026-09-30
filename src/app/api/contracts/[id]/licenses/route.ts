import { NextRequest } from "next/server";
import { created, badRequest, notFound, serverError, withAuth, createAuditLog } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { LicenseSchema } from "@/utils/validators";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (request, userId) => {
    try {
      const { id } = await params;
      const contract = await prisma.contract.findFirst({ where: { id, deletedAt: null }, select: { id: true, customerId: true, siteId: true, poNo: true } });
      if (!contract) return notFound("Contract");
      const parsed = LicenseSchema.pick({
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
      }).safeParse(await request.json());
      if (!parsed.success) return badRequest(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(", "));
      const data = parsed.data;
      const startDate = data.startDate ? new Date(data.startDate) : null;
      const endDate = data.endDate ? new Date(data.endDate) : null;
      if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime()))) return badRequest("Invalid license date");
      if (startDate && endDate && endDate <= startDate) return badRequest("License end date must be after start date");
      const createData: Prisma.LicenseUncheckedCreateInput = {
        licenseName: data.licenseName!,
        vendor: data.vendor,
        product: data.product,
        edition: data.edition,
        quantity: data.quantity,
        unit: data.unit,
        renewalStatus: data.renewalStatus,
        note: data.note,
        contractId: contract.id,
        customerId: contract.customerId,
        siteId: contract.siteId,
        poNumber: contract.poNo,
        startDate,
        endDate,
      };
      const license = await prisma.license.create({ data: createData });
      await createAuditLog({ userId, action: "CREATE", entityType: "license", entityId: license.id, newValues: { contractId: contract.id, licenseName: license.licenseName }, description: "Added license to contract", req: request });
      return created(license);
    } catch (error) { return serverError(error); }
  }, "license:write");
}
