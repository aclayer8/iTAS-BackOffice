// POST /api/admin/reset-data
// Clears all contract/asset/customer/notification data (keeps Users)
// For development / re-import use only

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Delete in dependency order (children first)
    const [notif, items, assets, contracts, customers] = await prisma.$transaction([
      prisma.notification.deleteMany({}),
      prisma.contractItem.deleteMany({}),
      prisma.asset.deleteMany({}),
      prisma.contract.deleteMany({}),
      prisma.customer.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        notifications: notif.count,
        contractItems: items.count,
        assets: assets.count,
        contracts: contracts.count,
        customers: customers.count,
      },
      message: "ล้างข้อมูลทั้งหมดเรียบร้อย — Users ยังคงอยู่",
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
