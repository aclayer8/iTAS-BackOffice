import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page  = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1", 10));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10));
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.license.findMany({
        where: { deletedAt: null },
        skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, companyName: true } },
          site:     { select: { id: true, siteName: true } },
        },
      }),
      prisma.license.count({ where: { deletedAt: null } }),
    ]);

    return NextResponse.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const license = await prisma.license.create({ data: body });
    return NextResponse.json({ success: true, data: license }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
