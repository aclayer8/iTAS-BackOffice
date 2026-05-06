// =============================================================
// iTAS BackOffice — Database Seed
// Run: npx prisma db seed
// =============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---- Vendors ----
  console.log("Creating vendors...");
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: "vendor-palo-alto" },
      update: {},
      create: {
        id: "vendor-palo-alto",
        name: "Palo Alto Networks",
        shortName: "PAN",
        country: "USA",
        website: "https://www.paloaltonetworks.com",
        supportPortal: "https://support.paloaltonetworks.com",
        supportEmail: "support@paloaltonetworks.com",
        isActive: true,
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-cisco" },
      update: {},
      create: {
        id: "vendor-cisco",
        name: "Cisco Systems",
        shortName: "Cisco",
        country: "USA",
        website: "https://www.cisco.com",
        supportPortal: "https://support.cisco.com",
        isActive: true,
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-vmware" },
      update: {},
      create: {
        id: "vendor-vmware",
        name: "VMware (Broadcom)",
        shortName: "VMware",
        country: "USA",
        website: "https://www.vmware.com",
        isActive: true,
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-microsoft" },
      update: {},
      create: {
        id: "vendor-microsoft",
        name: "Microsoft",
        shortName: "MSFT",
        country: "USA",
        website: "https://www.microsoft.com",
        supportPortal: "https://admin.microsoft.com",
        isActive: true,
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-fortinet" },
      update: {},
      create: {
        id: "vendor-fortinet",
        name: "Fortinet",
        shortName: "Fortinet",
        country: "USA",
        website: "https://www.fortinet.com",
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ ${vendors.length} vendors created`);

  // ---- Users ----
  console.log("Creating users...");
  const passwordHash = await bcrypt.hash("Admin@1234!", 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@itas.co.th" },
      update: {},
      create: {
        email: "admin@itas.co.th",
        name: "System Administrator",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        department: "IT",
      },
    }),
    prisma.user.upsert({
      where: { email: "sale@itas.co.th" },
      update: {},
      create: {
        email: "sale@itas.co.th",
        name: "Sales Manager",
        passwordHash: await bcrypt.hash("Sale@1234!", 12),
        role: "SALE",
        status: "ACTIVE",
        department: "Sales",
      },
    }),
    prisma.user.upsert({
      where: { email: "engineer@itas.co.th" },
      update: {},
      create: {
        email: "engineer@itas.co.th",
        name: "Senior Engineer",
        passwordHash: await bcrypt.hash("Eng@1234!", 12),
        role: "ENGINEER",
        status: "ACTIVE",
        department: "Technical",
        phone: "+66 81 234 5678",
      },
    }),
    prisma.user.upsert({
      where: { email: "viewer@itas.co.th" },
      update: {},
      create: {
        email: "viewer@itas.co.th",
        name: "Report Viewer",
        passwordHash: await bcrypt.hash("View@1234!", 12),
        role: "VIEWER",
        status: "ACTIVE",
        department: "Management",
      },
    }),
  ]);
  console.log(`✓ ${users.length} users created`);

  // ---- Tags ----
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: "Critical" }, update: {}, create: { name: "Critical", color: "#EF4444" } }),
    prisma.tag.upsert({ where: { name: "VIP Customer" }, update: {}, create: { name: "VIP Customer", color: "#F59E0B" } }),
    prisma.tag.upsert({ where: { name: "EOL Soon" }, update: {}, create: { name: "EOL Soon", color: "#F97316" } }),
    prisma.tag.upsert({ where: { name: "Managed Service" }, update: {}, create: { name: "Managed Service", color: "#8B5CF6" } }),
  ]);
  console.log(`✓ ${tags.length} tags created`);

  // ---- Sample Customers ----
  console.log("Creating sample customers...");
  const customer1 = await prisma.customer.upsert({
    where: { taxId: "0105560001234" },
    update: {},
    create: {
      companyName: "ABC Manufacturing Co., Ltd.",
      shortName: "ABC Mfg",
      taxId: "0105560001234",
      address: "999 Industrial Estate, Ayutthaya 13000",
      billingAddress: "999 Industrial Estate, Ayutthaya 13000",
      contactPerson: "Somchai Jaidee",
      contactPhone: "+66 35 123 456",
      contactEmail: "it@abcmfg.co.th",
      status: "ACTIVE",
      tier: "GOLD",
      industry: "Manufacturing",
      note: "Key account - automotive parts manufacturer",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { taxId: "0105560005678" },
    update: {},
    create: {
      companyName: "XYZ Financial Services Co., Ltd.",
      shortName: "XYZ Finance",
      taxId: "0105560005678",
      address: "88 Silom Tower, Bangkok 10500",
      contactPerson: "Wanida Thongchai",
      contactPhone: "+66 2 234 5678",
      contactEmail: "infra@xyzfinance.co.th",
      status: "ACTIVE",
      tier: "PLATINUM",
      industry: "Financial Services",
    },
  });

  // ---- Customer Sites ----
  const site1 = await prisma.customerSite.upsert({
    where: { id: "site-abc-hq" },
    update: {},
    create: {
      id: "site-abc-hq",
      customerId: customer1.id,
      siteName: "Head Office",
      address: "999 Industrial Estate",
      province: "Ayutthaya",
      country: "Thailand",
      isHeadOffice: true,
      contactPerson: "Somchai Jaidee",
      contactPhone: "+66 35 123 456",
    },
  });

  const site2 = await prisma.customerSite.upsert({
    where: { id: "site-abc-bkk" },
    update: {},
    create: {
      id: "site-abc-bkk",
      customerId: customer1.id,
      siteName: "Bangkok Office",
      address: "200 Rama IV Road",
      province: "Bangkok",
      country: "Thailand",
      isHeadOffice: false,
    },
  });

  const site3 = await prisma.customerSite.upsert({
    where: { id: "site-xyz-hq" },
    update: {},
    create: {
      id: "site-xyz-hq",
      customerId: customer2.id,
      siteName: "Silom Tower DC",
      address: "88 Silom Tower",
      province: "Bangkok",
      country: "Thailand",
      isHeadOffice: true,
    },
  });

  console.log("✓ Customers and sites created");

  // ---- Contract Sequences ----
  await prisma.contractSequence.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", year: 2026, sequence: 0 },
  });
  await prisma.renewalSequence.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", year: 2026, sequence: 0 },
  });
  await prisma.assetSequence.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", year: 2026, sequence: 0 },
  });

  // ---- Sample Contract ----
  const contract1 = await prisma.contract.upsert({
    where: { contractNo: "iTAS-MA260001" },
    update: {},
    create: {
      contractNo: "iTAS-MA260001",
      soNo: "SO-2026-001",
      poNo: "PO-ABCMFG-2026-001",
      quotationNo: "QUO-2026-001",
      customerId: customer1.id,
      siteId: site1.id,
      vendorId: vendors[0].id, // Palo Alto
      createdById: users[0].id, // Admin
      serviceDesc: "Annual Maintenance for Palo Alto Next-Gen Firewall",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      slaType: "ONSITE_NBD",
      supportType: "BUSINESS_HOURS",
      status: "ACTIVE",
      autoRenew: true,
      totalValue: 250000,
      currency: "THB",
    },
  });

  // Contract Items
  await prisma.contractItem.createMany({
    skipDuplicates: true,
    data: [
      {
        contractId: contract1.id,
        itemType: "HARDWARE",
        partNumber: "PAN-PA-3220",
        brand: "Palo Alto Networks",
        model: "PA-3220",
        description: "Next-Gen Firewall PA-3220 - Annual Support",
        serialNumber: "001801012345",
        quantity: 1,
        unit: "EA",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        sla: "NBD Onsite",
        unitPrice: 150000,
        totalPrice: 150000,
        sortOrder: 1,
      },
      {
        contractId: contract1.id,
        itemType: "SUBSCRIPTION",
        partNumber: "PAN-PA-3220-TP",
        brand: "Palo Alto Networks",
        model: "Threat Prevention",
        description: "Threat Prevention Subscription",
        serialNumber: null, // License - no serial
        quantity: 1,
        unit: "LICENSE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        unitPrice: 100000,
        totalPrice: 100000,
        sortOrder: 2,
      },
    ],
  });

  // ---- Sample Assets ----
  await prisma.asset.upsert({
    where: { assetCode: "AST-2600001" },
    update: {},
    create: {
      assetCode: "AST-2600001",
      brand: "Palo Alto Networks",
      model: "PA-3220",
      serialNumber: "001801012345",
      assetType: "FIREWALL",
      customerId: customer1.id,
      siteId: site1.id,
      engineerOwnerId: users[2].id, // Engineer
      vendorId: vendors[0].id,
      partNumber: "PAN-PA-3220",
      installDate: new Date("2023-01-15"),
      warrantyStart: new Date("2023-01-15"),
      warrantyEnd: new Date("2026-01-14"),
      lifecycleStatus: "ACTIVE",
      rackLocation: "DC-RACK-01-U10",
      ipAddress: "192.168.1.1",
      firmwareVersion: "10.2.4",
      purchasePrice: 850000,
      purchaseDate: new Date("2023-01-10"),
    },
  });

  await prisma.asset.upsert({
    where: { assetCode: "AST-2600002" },
    update: {},
    create: {
      assetCode: "AST-2600002",
      brand: "Cisco",
      model: "Catalyst 9300-48P",
      serialNumber: "FDO2345X001",
      assetType: "SWITCH",
      customerId: customer1.id,
      siteId: site1.id,
      vendorId: vendors[1].id,
      installDate: new Date("2023-03-01"),
      warrantyStart: new Date("2023-03-01"),
      warrantyEnd: new Date("2026-05-15"),
      lifecycleStatus: "ACTIVE",
      rackLocation: "DC-RACK-01-U12",
      firmwareVersion: "17.6.5",
    },
  });

  // ---- Sample License ----
  await prisma.license.create({
    data: {
      licenseName: "VMware vSphere Standard - 10 Cores",
      vendor: "VMware",
      vendorId: vendors[2].id,
      product: "vSphere",
      edition: "Standard",
      quantity: 10,
      unit: "CORES",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      customerId: customer2.id,
      siteId: site3.id,
      renewalStatus: "ACTIVE",
      purchasePrice: 320000,
    },
  });

  console.log("✓ Contracts, assets, and licenses created");

  console.log("\n✅ Seeding complete!");
  console.log("\nDefault Login Credentials:");
  console.log("  Admin:    admin@itas.co.th    / Admin@1234!");
  console.log("  Sale:     sale@itas.co.th     / Sale@1234!");
  console.log("  Engineer: engineer@itas.co.th / Eng@1234!");
  console.log("  Viewer:   viewer@itas.co.th   / View@1234!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
