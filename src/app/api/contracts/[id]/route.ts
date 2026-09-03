import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  badRequest,
  conflict,
  notDeleted,
  notFound,
  ok,
  serverError,
  withAuth,
} from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const nullableText = (maxLength: number) =>
  z.string().max(maxLength).transform((value) => value.trim() || null).nullable();

const ContractUpdateSchema = z.object({
  contractNo: z.string().trim().min(1).max(100),
  customerId: z.string().cuid("Invalid customer"),
  soNo: nullableText(100),
  poNo: nullableText(100),
  serviceDesc: nullableText(1000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slaType: z.enum(["ONSITE_NBD", "ONSITE_4HR", "REMOTE_NBD", "REMOTE_4HR", "BEST_EFFORT", "CUSTOM"]),
  supportType: z.enum(["BUSINESS_HOURS", "EXTENDED", "TWENTYFOUR_SEVEN", "CUSTOM"]),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "CANCELLED", "PENDING_RENEWAL"]),
  autoRenew: z.boolean(),
  totalValue: z.number().positive().nullable(),
  currency: z.string().trim().min(1).max(10),
  remark: nullableText(2000),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: "End date must be after start date", path: ["endDate"] },
);

function auditValues(contract: {
  contractNo: string;
  customerId: string;
  soNo: string | null;
  poNo: string | null;
  serviceDesc: string | null;
  startDate: Date;
  endDate: Date;
  slaType: string;
  supportType: string;
  status: string;
  autoRenew: boolean;
  totalValue: Prisma.Decimal | null;
  currency: string;
  remark: string | null;
}) {
  return {
    contractNo: contract.contractNo,
    customerId: contract.customerId,
    soNo: contract.soNo,
    poNo: contract.poNo,
    serviceDesc: contract.serviceDesc,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate.toISOString(),
    slaType: contract.slaType,
    supportType: contract.supportType,
    status: contract.status,
    autoRenew: contract.autoRenew,
    totalValue: contract.totalValue?.toString() ?? null,
    currency: contract.currency,
    remark: contract.remark,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req, async () => {
    try {
      const { id } = await params;
      const contract = await prisma.contract.findFirst({
        where: { id, ...notDeleted },
        select: {
          id: true,
          contractNo: true,
          customerId: true,
          soNo: true,
          poNo: true,
          serviceDesc: true,
          startDate: true,
          endDate: true,
          slaType: true,
          supportType: true,
          status: true,
          autoRenew: true,
          totalValue: true,
          currency: true,
          remark: true,
          customer: { select: { companyName: true } },
          items: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              partNumber: true,
              description: true,
              serialNumber: true,
              quantity: true,
              unit: true,
              sla: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      if (!contract) return notFound("Contract");

      return ok({
        ...contract,
        totalValue: contract.totalValue?.toString() ?? null,
      });
    } catch (error) {
      return serverError(error);
    }
  }, "contract:read");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req, async (req, userId) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = ContractUpdateSchema.safeParse(body);

      if (!parsed.success) {
        return badRequest(
          parsed.error.errors.map((error) => `${error.path.join(".")}: ${error.message}`).join(", "),
        );
      }

      const existing = await prisma.contract.findFirst({
        where: { id, ...notDeleted },
        select: {
          contractNo: true,
          customerId: true,
          soNo: true,
          poNo: true,
          serviceDesc: true,
          startDate: true,
          endDate: true,
          slaType: true,
          supportType: true,
          status: true,
          autoRenew: true,
          totalValue: true,
          currency: true,
          remark: true,
        },
      });

      if (!existing) return notFound("Contract");

      const data = parsed.data;
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, ...notDeleted },
        select: { id: true },
      });

      if (!customer) return badRequest("Customer not found");

      const updated = await prisma.$transaction(async (tx) => {
        const contract = await tx.contract.update({
          where: { id },
          data: {
            contractNo: data.contractNo,
            customerId: data.customerId,
            soNo: data.soNo,
            poNo: data.poNo,
            serviceDesc: data.serviceDesc,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            slaType: data.slaType,
            supportType: data.supportType,
            status: data.status,
            autoRenew: data.autoRenew,
            totalValue: data.totalValue,
            currency: data.currency,
            remark: data.remark,
            version: { increment: 1 },
          },
          include: {
            customer: { select: { id: true, companyName: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "UPDATE",
            entityType: "contract",
            entityId: id,
            oldValues: auditValues(existing),
            newValues: auditValues(contract),
            description: `Updated contract ${contract.contractNo}`,
          },
        });

        return contract;
      });

      return ok({
        ...updated,
        totalValue: updated.totalValue?.toString() ?? null,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return conflict("Contract No. already exists");
      }
      return serverError(error);
    }
  }, "contract:write");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req, async (_req, userId) => {
    try {
      const { id } = await params;
      const deletedAt = new Date();

      const deleted = await prisma.$transaction(async (tx) => {
        const existing = await tx.contract.findFirst({
          where: { id, ...notDeleted },
          select: {
            contractNo: true,
            customerId: true,
            soNo: true,
            poNo: true,
            serviceDesc: true,
            startDate: true,
            endDate: true,
            slaType: true,
            supportType: true,
            status: true,
            autoRenew: true,
            totalValue: true,
            currency: true,
            remark: true,
          },
        });

        if (!existing) return null;

        const updateResult = await tx.contract.updateMany({
          where: { id, ...notDeleted },
          data: {
            deletedAt,
            version: { increment: 1 },
          },
        });

        if (updateResult.count !== 1) return null;

        await tx.auditLog.create({
          data: {
            userId,
            action: "DELETE",
            entityType: "contract",
            entityId: id,
            oldValues: auditValues(existing),
            newValues: { deletedAt: deletedAt.toISOString() },
            description: `Deleted contract ${existing.contractNo}`,
          },
        });

        return { id, contractNo: existing.contractNo };
      });

      if (!deleted) return notFound("Contract");
      return ok(deleted);
    } catch (error) {
      return serverError(error);
    }
  }, "contract:delete");
}
