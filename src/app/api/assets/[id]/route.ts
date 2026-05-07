import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { brand, model } = body as { brand?: string; model?: string };

    if (!brand && !model) {
      return NextResponse.json({ error: "brand or model required" }, { status: 400 });
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(brand ? { brand: brand.trim() } : {}),
        ...(model ? { model: model.trim() } : {}),
      },
      select: { id: true, brand: true, model: true },
    });

    return NextResponse.json({ success: true, asset });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
