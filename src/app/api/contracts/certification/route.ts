import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/contracts/certification
// Simple endpoint for the New Contract (Certification) form.
// Does not require auth session - uses first admin user as createdById.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { form, customer, customerId, items } = body as {
      form: {
        contractNo: string;
        poNo: string;
        soNo: string;
        date: string;
        serviceDesc: string;
        remark: string;
      };
      customer: {
        companyName: string;
        address: string;
        contactPerson: string;
        contactPhone: string;
        contactEmail: string;
      };
      customerId: string | null;
      items: Array<{
        partNumber: string;
        description: string;
        quantity: string;
        unit: string;
        sla: string;
        startDate: string;
        endDate: string;
        serialNumber: string;
        remark: string;
      }>;
    };

    if (!form.contractNo) {
      return NextResponse.json({ success: false, error: "Contract No. is required" }, { status: 400 });
    }

    // Find a system user to use as createdById
    const systemUser = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!systemUser) {
      return NextResponse.json({ success: false, error: "No users found in system" }, { status: 500 });
    }

    // Determine customerId: use selected or find by name or create new customer
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customer.companyName) {
      const existing = await prisma.customer.findFirst({
        where: { companyName: { equals: customer.companyName, mode: "insensitive" }, deletedAt: null },
      });
      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            companyName: customer.companyName,
            shortName: customer.companyName.split(" ")[0] ?? customer.companyName,
            address: customer.address || null,
            contactPerson: customer.contactPerson || null,
            contactPhone: customer.contactPhone || null,
            contactEmail: customer.contactEmail || null,
            status: "ACTIVE",
          },
        });
        resolvedCustomerId = newCustomer.id;
      }
    }
    if (!resolvedCustomerId) {
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
      const c = await tx.contract.create({
        data: {
          contractNo:  form.contractNo,
          poNo:        form.poNo || null,
          soNo:        form.soNo || null,
          serviceDesc: form.serviceDesc || null,
          remark:      form.remark || null,
          customerId:  resolvedCustomerId!,
          createdById: systemUser.id,
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

      return c;
    });

    return NextResponse.json({ success: true, contractId: contract.id });
  } catch (error) {
    console.error("[certification POST]", error);
    return serverError(error);
  }
}
