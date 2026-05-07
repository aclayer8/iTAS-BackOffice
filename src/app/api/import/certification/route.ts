// =============================================================
// POST /api/import/certification
// Accepts Excel Certification Form -> imports to DB
// Creates: Customer, Contract, ContractItems, Assets, Notifications
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCertificationWorkbook, ParsedItem } from "@/lib/excel-parser";
import { generateAssetCode } from "@/lib/contract-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SlaType =
  | "ONSITE_NBD" | "ONSITE_4HR" | "REMOTE_NBD" | "REMOTE_4HR"
  | "BEST_EFFORT" | "CUSTOM";

function mapSla(sla: string): SlaType {
  const s = sla.toLowerCase().replace(/\s/g, "").replace(/_/g, "");
  if (s.includes("24x7") && (s.includes("4hr") || s.includes("x4"))) return "ONSITE_4HR";
  if (s.includes("8x5") && (s.includes("4hr") || s.includes("x4")))  return "ONSITE_4HR";
  if (s.includes("24x7"))  return "ONSITE_NBD";
  if (s.includes("8x5"))   return "ONSITE_NBD";
  if (s.includes("remote") && s.includes("4")) return "REMOTE_4HR";
  if (s.includes("remote")) return "REMOTE_NBD";
  if (s.includes("best") || s.includes("effort")) return "BEST_EFFORT";
  return "CUSTOM";
}

type AssetType =
  | "FIREWALL" | "SWITCH" | "WIRELESS_AP" | "SERVER" | "STORAGE"
  | "UPS" | "ROUTER" | "LOAD_BALANCER" | "OTHER";

function detectAssetType(desc: string, partNo: string): AssetType {
  const t = (desc + " " + partNo).toLowerCase();
  if (/firewall|palo\s*alto|pa-\d|fortigate|fgt-|asa\d|firepower|fortiweb|fortimail/.test(t)) return "FIREWALL";
  if (/\bswitch\b|catalyst|c9[0-9k]|nexus|sg-\d|ws-c\d|n[39]\d\d\d/.test(t))               return "SWITCH";
  if (/access[\s-]?point|wireless[\s-]?ap|\bwap\b|air-ap|aironet|\bap\d/.test(t))            return "WIRELESS_AP";
  if (/\bserver\b|ucs-[bc]|poweredge|proliant|rack[\s-]?server/.test(t))                      return "SERVER";
  if (/\bstorage\b|\bsan\b|\bnas\b|netapp|vnx|pure[\s-]?storage|unity/.test(t))               return "STORAGE";
  if (/\bups\b|uninterruptible|smart-?ups|symmetra/.test(t))                                   return "UPS";
  if (/\brouter\b|\bisr\d|\basr\d|rv\d{3}|c\d{3,4}[a-z]/.test(t))                           return "ROUTER";
  if (/load[\s-]?balanc|big-?ip|\bf5\b|netscaler|ltm|citrix\s*adc/.test(t))                  return "LOAD_BALANCER";
  return "OTHER";
}

function extractBrand(desc: string, partNo: string): string {
  const t = (desc + " " + partNo).toLowerCase();
  if (t.includes("palo alto") || /^pan-/.test(partNo.toLowerCase())) return "Palo Alto Networks";
  if (t.includes("cisco") || /^(ws-|cat|c9|asr|isr|air-)/.test(partNo.toLowerCase())) return "Cisco";
  if (t.includes("fortinet") || /^fgt-|^fwb-|^fml-/.test(partNo.toLowerCase()))       return "Fortinet";
  if (t.includes("vmware"))      return "VMware";
  if (t.includes("microsoft"))   return "Microsoft";
  if (t.includes("logpoint"))    return "LogPoint";
  if (t.includes("checkpoint"))  return "Check Point";
  if (t.includes("juniper"))     return "Juniper";
  if (t.includes("hp") || t.includes("hewlett")) return "HP";
  if (t.includes("dell"))        return "Dell";
  if (t.includes("netapp"))      return "NetApp";
  if (t.includes("apc"))         return "APC";
  if (t.includes("f5"))          return "F5";
  return "Unknown";
}

function extractModel(desc: string, partNo: string): string {
  // partNo is the most reliable model identifier (e.g. AIR-CAP2702I-A-K9, WS-C2960X-48FPD-L)
  if (partNo && partNo.trim().length > 2) return partNo.trim().slice(0, 80);
  // fallback: extract first meaningful token from description
  const match = desc.match(/^([A-Z0-9][A-Z0-9\-/]{4,})/i);
  if (match) return match[1];
  return desc.split(",")[0].trim().slice(0, 60);
}

// suppress unused import warning
type _ParsedItemType = ParsedItem;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const forceReimport = formData.get("force") === "true";

    const buffer = Buffer.from(await file.arrayBuffer());
    const sheets  = parseCertificationWorkbook(buffer);

    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    });
    if (!adminUser) {
      const bcrypt = await import("bcryptjs");
      adminUser = await prisma.user.upsert({
        where: { email: "admin@itas.co.th" },
        update: {},
        create: {
          email: "admin@itas.co.th",
          name: "System Admin",
          passwordHash: await bcrypt.hash("Admin@1234!", 10),
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    const results = [];

    for (const sheet of sheets) {
      const result: {
        sheetName: string;
        contractNo: string;
        status: "imported" | "skipped" | "error";
        customerId?: string;
        customerName?: string;
        contractId?: string;
        assetsCreated: number;
        itemsCreated: number;
        notificationsCreated: number;
        message: string;
        parseErrors?: string[];
      } = {
        sheetName: sheet.sheetName,
        contractNo: sheet.contractNo,
        status: "error",
        assetsCreated: 0,
        itemsCreated: 0,
        notificationsCreated: 0,
        message: "",
        parseErrors: sheet.parseErrors.length > 0 ? sheet.parseErrors : undefined,
      };

      try {
        if (!sheet.contractNo || !sheet.customer.name) {
          result.status = "skipped";
          result.message = `Skipped: missing contractNo="${sheet.contractNo}" or customer="${sheet.customer.name}". Parse errors: ${sheet.parseErrors.join(", ") || "none"}`;
          results.push(result);
          continue;
        }

        const existingContract = await prisma.contract.findUnique({
          where: { contractNo: sheet.contractNo },
        });
        if (existingContract) {
          if (!forceReimport) {
            result.status = "skipped";
            result.contractId = existingContract.id;
            result.message = `Contract ${sheet.contractNo} already exists — skip (check Force re-import to overwrite)`;
            results.push(result);
            continue;
          }
          await prisma.contractItem.deleteMany({ where: { contractId: existingContract.id } });
          await prisma.notification.deleteMany({ where: { entityId: existingContract.id } });
          await prisma.contract.delete({ where: { id: existingContract.id } });
        }

        let customer = await prisma.customer.findFirst({
          where: {
            companyName: { equals: sheet.customer.name, mode: "insensitive" },
            deletedAt: null,
          },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              companyName:   sheet.customer.name,
              address:       sheet.customer.address || null,
              contactPerson: sheet.customer.contactPerson || null,
              contactPhone:  sheet.customer.phone || null,
              contactEmail:  sheet.customer.email || null,
              status:        "ACTIVE",
            },
          });
        } else {
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              ...(customer.address       ? {} : { address:       sheet.customer.address || null }),
              ...(customer.contactPerson ? {} : { contactPerson: sheet.customer.contactPerson || null }),
              ...(customer.contactPhone  ? {} : { contactPhone:  sheet.customer.phone || null }),
              ...(customer.contactEmail  ? {} : { contactEmail:  sheet.customer.email || null }),
            },
          });
        }

        result.customerId   = customer.id;
        result.customerName = customer.companyName;

        const slaCounts: Record<string, number> = {};
        sheet.items.forEach((item) => {
          const s = mapSla(item.sla);
          slaCounts[s] = (slaCounts[s] ?? 0) + 1;
        });
        const contractSla = (Object.entries(slaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ONSITE_NBD") as SlaType;

        const itemStarts = sheet.items.map((i) => i.startDate).filter(Boolean) as Date[];
        const itemEnds   = sheet.items.map((i) => i.endDate).filter(Boolean) as Date[];
        const contractStart = itemStarts.length ? new Date(Math.min(...itemStarts.map((d) => d.getTime()))) : (sheet.date ?? new Date());
        const contractEnd   = itemEnds.length   ? new Date(Math.max(...itemEnds.map((d) => d.getTime())))   : new Date(contractStart.getFullYear() + 1, contractStart.getMonth(), contractStart.getDate());

        const contract = await prisma.contract.create({
          data: {
            contractNo:  sheet.contractNo,
            poNo:        sheet.poNo || null,
            soNo:        sheet.soNo || null,
            customerId:  customer.id,
            createdById: adminUser.id,
            serviceDesc: sheet.serviceDesc || null,
            startDate:   contractStart,
            endDate:     contractEnd,
            slaType:     contractSla,
            supportType: contractSla.startsWith("ONSITE") ? "BUSINESS_HOURS" : "BUSINESS_HOURS",
            status:      contractEnd > new Date() ? "ACTIVE" : "EXPIRED",
          },
        });

        result.contractId = contract.id;

        let itemsCreated  = 0;
        let assetsCreated = 0;

        for (const item of sheet.items) {
          let assetId: string | undefined;

          if (item.serialNumber) {
            const existingAsset = await prisma.asset.findFirst({
              where: { serialNumber: { equals: item.serialNumber, mode: "insensitive" } },
            });

            if (!existingAsset) {
              const assetCode = await generateAssetCode();
              const brand     = extractBrand(item.description, item.partNumber);
              const model     = extractModel(item.description, item.partNumber);
              const assetType = detectAssetType(item.description, item.partNumber);

              const asset = await prisma.asset.create({
                data: {
                  assetCode,
                  brand,
                  model,
                  serialNumber:    item.serialNumber,
                  partNumber:      item.partNumber || null,
                  assetType,
                  customerId:      customer.id,
                  warrantyStart:   item.startDate ?? null,
                  warrantyEnd:     item.endDate   ?? null,
                  installDate:     item.startDate ?? null,
                  lifecycleStatus: "ACTIVE",
                },
              });
              assetId = asset.id;
              assetsCreated++;
            } else {
              assetId = existingAsset.id;
              if (!existingAsset.warrantyEnd && item.endDate) {
                await prisma.asset.update({
                  where: { id: existingAsset.id },
                  data: { warrantyEnd: item.endDate, warrantyStart: item.startDate ?? undefined },
                });
              }
            }
          }

          const itemType: "HARDWARE" | "LICENSE" | "SUBSCRIPTION" | "SERVICE" | "SUPPORT" =
            item.serialNumber ? "HARDWARE"
            : /license|subscription|subscr|subs/i.test(item.description) ? "LICENSE"
            : /software|sw|support/i.test(item.description) ? "SUPPORT"
            : "SERVICE";

          await prisma.contractItem.create({
            data: {
              contractId:   contract.id,
              itemType,
              partNumber:   item.partNumber   || null,
              description:  item.description  || null,
              serialNumber: item.serialNumber || null,
              startDate:    item.startDate    ?? null,
              endDate:      item.endDate      ?? null,
              sla:          item.sla          || null,
              warrantyRef:  assetId           || null,
              remark:       item.remark       || null,
              sortOrder:    item.itemNo,
              quantity:     item.quantity ? parseInt(item.quantity) || 1 : 1,
              unit:         item.quantity && /[a-z]/i.test(item.quantity) ? item.quantity.replace(/\d+\s*/g, "").trim() : "EA",
            },
          });
          itemsCreated++;
        }

        result.itemsCreated  = itemsCreated;
        result.assetsCreated = assetsCreated;

        const notifUsers = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "SALE"] }, status: "ACTIVE", deletedAt: null },
        });

        let notifCount = 0;
        const daysUntilContractEnd = Math.ceil((contractEnd.getTime() - Date.now()) / 86400000);

        if (daysUntilContractEnd <= 90 && daysUntilContractEnd > -30) {
          for (const u of notifUsers) {
            await prisma.notification.create({
              data: {
                userId:     u.id,
                type:       "CONTRACT_EXPIRING",
                title:      `Contract ${sheet.contractNo} expiring soon`,
                message:    `Contract for ${customer.companyName} (${sheet.contractNo}) ${
                  daysUntilContractEnd < 0
                    ? `expired ${Math.abs(daysUntilContractEnd)} days ago`
                    : `expires in ${daysUntilContractEnd} days (${contractEnd.toLocaleDateString("en-GB")})`
                }`,
                entityType: "contract",
                entityId:   contract.id,
                daysUntil:  daysUntilContractEnd,
              },
            });
            notifCount++;
          }
        }

        for (const item of sheet.items) {
          if (!item.serialNumber || !item.endDate) continue;
          const daysUntilWarranty = Math.ceil((item.endDate.getTime() - Date.now()) / 86400000);
          if (daysUntilWarranty <= 90 && daysUntilWarranty > -30) {
            for (const u of notifUsers) {
              await prisma.notification.create({
                data: {
                  userId:    u.id,
                  type:      "WARRANTY_EXPIRING",
                  title:     `Warranty ${item.serialNumber} expiring soon`,
                  message:   `Device Serial: ${item.serialNumber} (${item.description?.split(",")[0] ?? ""}) for ${customer.companyName} ${
                    daysUntilWarranty < 0
                      ? `warranty expired ${Math.abs(daysUntilWarranty)} days ago`
                      : `expires in ${daysUntilWarranty} days`
                  }`,
                  entityType: "contract",
                  entityId:   contract.id,
                  daysUntil:  daysUntilWarranty,
                },
              });
              notifCount++;
            }
          }
        }

        result.notificationsCreated = notifCount;
        result.status  = "imported";
        result.message = `Imported: ${itemsCreated} items, ${assetsCreated} new assets${notifCount > 0 ? `, ${notifCount} notifications` : ""}`;

      } catch (sheetErr) {
        result.status  = "error";
        result.message = `Error: ${String(sheetErr)}`;
      }

      results.push(result);
    }

    const summary = {
      total:    results.length,
      imported: results.filter((r) => r.status === "imported").length,
      skipped:  results.filter((r) => r.status === "skipped").length,
      errors:   results.filter((r) => r.status === "error").length,
    };

    return NextResponse.json({ success: true, summary, results });
  } catch (err) {
    console.error("[import/certification] Fatal error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
