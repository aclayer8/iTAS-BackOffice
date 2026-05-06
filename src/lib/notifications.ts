// =============================================================
// iTAS BackOffice — Notification Engine
// Runs via cron job / API trigger to check expiries
// =============================================================

import prisma from "./prisma";

const THRESHOLDS = [90, 60, 30]; // Days before expiry

// ---- Main Notification Job ----

export async function runExpiryNotificationJob(): Promise<{
  contracts: number;
  warranties: number;
  licenses: number;
}> {
  const now = new Date();
  let contractCount = 0;
  let warrantyCount = 0;
  let licenseCount = 0;

  // Get all admin and sale users for notifications
  const targetUsers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["ADMIN", "SALE"] },
      deletedAt: null,
    },
    select: { id: true, email: true, name: true },
  });

  for (const days of THRESHOLDS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ---- Expiring Contracts ----
    const expiringContracts = await prisma.contract.findMany({
      where: {
        endDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ["ACTIVE", "PENDING_RENEWAL"] },
        deletedAt: null,
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    for (const contract of expiringContracts) {
      for (const user of targetUsers) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: "CONTRACT_EXPIRING",
            entityId: contract.id,
            daysUntil: days,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Not sent in last 24h
            },
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "CONTRACT_EXPIRING",
              title: `Contract Expiring in ${days} Days`,
              message: `Contract ${contract.contractNo} for ${contract.customer.companyName} expires on ${contract.endDate.toLocaleDateString()}.`,
              entityType: "contract",
              entityId: contract.id,
              daysUntil: days,
            },
          });
          contractCount++;
        }
      }
    }

    // ---- Expiring Warranties ----
    const expiringAssets = await prisma.asset.findMany({
      where: {
        warrantyEnd: { gte: startOfDay, lte: endOfDay },
        lifecycleStatus: "ACTIVE",
        deletedAt: null,
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    // Get engineer users too for warranty alerts
    const engineerUsers = await prisma.user.findMany({
      where: { status: "ACTIVE", role: "ENGINEER", deletedAt: null },
      select: { id: true },
    });
    const allWarrantyUsers = [...targetUsers, ...engineerUsers];

    for (const asset of expiringAssets) {
      for (const user of allWarrantyUsers) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: "WARRANTY_EXPIRING",
            entityId: asset.id,
            daysUntil: days,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "WARRANTY_EXPIRING",
              title: `Warranty Expiring in ${days} Days`,
              message: `${asset.brand} ${asset.model} (${asset.serialNumber ?? asset.assetCode}) for ${asset.customer.companyName} warranty expires on ${asset.warrantyEnd!.toLocaleDateString()}.`,
              entityType: "asset",
              entityId: asset.id,
              daysUntil: days,
            },
          });
          warrantyCount++;
        }
      }
    }

    // ---- Expiring Licenses ----
    const expiringLicenses = await prisma.license.findMany({
      where: {
        endDate: { gte: startOfDay, lte: endOfDay },
        renewalStatus: { in: ["ACTIVE", "EXPIRING_SOON"] },
        deletedAt: null,
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    for (const license of expiringLicenses) {
      for (const user of targetUsers) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: "LICENSE_EXPIRING",
            entityId: license.id,
            daysUntil: days,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "LICENSE_EXPIRING",
              title: `License Expiring in ${days} Days`,
              message: `${license.licenseName} for ${license.customer?.companyName ?? "Unknown"} expires on ${license.endDate!.toLocaleDateString()}.`,
              entityType: "license",
              entityId: license.id,
              daysUntil: days,
            },
          });
          licenseCount++;
        }
      }
    }
  }

  // Update license renewal status
  await prisma.license.updateMany({
    where: {
      endDate: { lte: new Date() },
      renewalStatus: { in: ["ACTIVE", "EXPIRING_SOON"] },
    },
    data: { renewalStatus: "EXPIRED" },
  });

  await prisma.license.updateMany({
    where: {
      endDate: {
        gte: new Date(),
        lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
      renewalStatus: "ACTIVE",
    },
    data: { renewalStatus: "EXPIRING_SOON" },
  });

  return { contracts: contractCount, warranties: warrantyCount, licenses: licenseCount };
}
