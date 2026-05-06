import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page  = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1", 10));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10));
    const search = url.searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
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
        where, skip, take: limit,
        orderBy: { companyName: "asc" },
        include: {
          _count: { select: { sites: true, contracts: true, assets: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customer = await prisma.customer.create({ data: body });
    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
