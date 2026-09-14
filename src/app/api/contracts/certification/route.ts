import { NextRequest, NextResponse } from "next/server";
import { serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// POST /api/contracts/certification
// Simple endpoint for the New Contract (Certification) form.
const optionalText = (max: number) => z.string().trim().max(max).default("");
const optionalDate = z.string().max(32).refine(
  (value) => !value || Number.isFinite(new Date(value).getTime()),
  "Invalid date"
).default("");
const CertificationSchema = z.object({
  form: z.object({
    contractNo: z.string().trim().min(1).max(100),
    poNo: optionalText(100),
    soNo: optionalText(100),
    date: optionalDate,
    serviceDesc: optionalText(2_000),
    remark: optionalText(2_000),
  }),
  customer: z.object({
    companyName: optionalText(255),
    address: optionalText(2_000),
    contactPerson: optionalText(255),
    contactPhone: optionalText(100),
    contactEmail: z.union([z.literal(""), z.string().email().max(255)]).default(""),
  }),
  customerId: z.string().max(100).nullable(),
  items: z.array(z.object({
    partNumber: optionalText(255),
    description: optionalText(2_000),
    quantity: optionalText(20),
    unit: optionalText(50),
    sla: optionalText(255),
    startDate: optionalDate,
    endDate: optionalDate,
    serialNumber: optionalText(255),
    remark: optionalText(2_000),
  })).max(500),
});

async function createCertification(req: NextRequest, userId: string) {
  try {
    const parsed = CertificationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid certification data" }, { status: 400 });
    }
    const { form, customer, customerId, items } = parsed.data;

    // Resolve an existing customer first. New customer creation stays in the
    // contract transaction so a failed contract cannot leave an orphan record.
    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const selectedCustomer = await prisma.customer.findFirst({
        where: { id: resolvedCustomerId, deletedAt: null },
        select: { id: true },
      });
      if (!selectedCustomer) {
        return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
      }
    }
    if (!resolvedCustomerId && customer.companyName) {
      const existing = await prisma.customer.findFirst({
        where: { companyName: { equals: customer.companyName, mode: "insensitive" }, deletedAt: null },
      });
      if (existing) resolvedCustomerId = existing.id;
    }
    if (!resolvedCustomerId && !customer.companyName) {
      return NextResponse.json({ success: false, error: "Customer is required" }, { status: 400 });
    }

    // Compute contract start/end from items or default to today / +1yr
    const validItems = items.filter((it) => it.description || it.partNumber);
    const itemStartDates = validItems.map((it) => it.startDate).filter(Boolean).map((d) => new Date(d));
    const itemEndDates   = validItems.map((it) => it.endDate).filter(Boolean).map((d) => new Date(d));

    const contractStart = itemStartDates.length > 0
      ? new Date(Math.min(...itemStartDates.map((d) => d.getTime())))
      : new Date(form.date || Date.now());
    const contractEnd = itemEndDates.length > 0
      ? new Date(Math.max(...itemEndDates.map((d) => d.getTime())))
      : new Date(new Date(contractStart).setFullYear(contractStart.getFullYear() + 1));

    // Create contract + items in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const contractCustomerId = resolvedCustomerId ?? (await tx.customer.create({
        data: {
          companyName: customer.companyName,
          shortName: customer.companyName.split(" ")[0] || customer.companyName,
          address: customer.address || null,
          contactPerson: customer.contactPerson || null,
          contactPhone: customer.contactPhone || null,
          contactEmail: customer.contactEmail || null,
          status: "ACTIVE",
        },
      })).id;

      const c = await tx.contract.create({
        data: {
          contractNo:  form.contractNo,
          poNo:        form.poNo || null,
          soNo:        form.soNo || null,
          serviceDesc: form.serviceDesc || null,
          remark:      form.remark || null,
          customerId:  contractCustomerId,
          createdById: userId,
          startDate:   contractStart,
          endDate:     contractEnd,
          slaType:     "CUSTOM",
          supportType: "BUSINESS_HOURS",
          status:      "ACTIVE",
        },
      });

      if (validItems.length > 0) {
        await tx.contractItem.createMany({
          data: validItems.map((it, idx) => ({
            contractId:   c.id,
            itemType:     "HARDWARE",
            partNumber:   it.partNumber || null,
            description:  it.description || null,
            serialNumber: it.serialNumber || null,
            quantity:     parseInt(it.quantity) || 1,
            unit:         it.unit || "EA",
            sla:          it.sla || null,
            startDate:    it.startDate ? new Date(it.startDate) : null,
            endDate:      it.endDate   ? new Date(it.endDate)   : null,
            remark:       it.remark    || null,
            sortOrder:    idx,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entityType: "contract",
          entityId: c.id,
          newValues: { contractNo: c.contractNo, customerId: contractCustomerId },
          description: `Created certification contract ${c.contractNo}`,
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          entityType: "contract",
          entityId: c.id,
          action: "Contract Created",
          description: `Certification contract ${c.contractNo} created`,
        },
      });

      return c;
    });

    return NextResponse.json({ success: true, contractId: contract.id });
  } catch (error) {
    console.error("[certification POST]", error);
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  return withAuth(req, createCertification, "contract:write");
}
