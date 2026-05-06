// =============================================================
// iTAS BackOffice — Auto Contract Number Generation
// Format: iTAS-MA260001 (year + 4-digit sequence, resets yearly)
// =============================================================

import prisma from "./prisma";

export async function generateContractNumber(): Promise<string> {
  const now = new Date();
  const yearFull = now.getFullYear();          // e.g. 2026
  const yearShort = String(yearFull).slice(2); // e.g. "26"

  return await prisma.$transaction(async (tx) => {
    const seq = await tx.contractSequence.upsert({
      where: { id: "singleton" },
      update: {
        sequence: {
          increment: 1,
        },
        // Reset on year change
        ...(await shouldReset(tx, "contract", yearFull)
          ? { sequence: 1, year: yearFull }
          : {}),
      },
      create: {
        id: "singleton",
        year: yearFull,
        sequence: 1,
      },
    });

    const padded = String(seq.sequence).padStart(4, "0");
    return `iTAS-MA${yearShort}${padded}`;
  });
}

export async function generateRenewalNumber(): Promise<string> {
  const now = new Date();
  const yearFull = now.getFullYear();
  const yearShort = String(yearFull).slice(2);

  return await prisma.$transaction(async (tx) => {
    const seq = await tx.renewalSequence.upsert({
      where: { id: "singleton" },
      update: { sequence: { increment: 1 } },
      create: { id: "singleton", year: yearFull, sequence: 1 },
    });

    const padded = String(seq.sequence).padStart(4, "0");
    return `RNW-${yearShort}${padded}`;
  });
}

export async function generateAssetCode(): Promise<string> {
  const now = new Date();
  const yearFull = now.getFullYear();
  const yearShort = String(yearFull).slice(2);

  return await prisma.$transaction(async (tx) => {
    const seq = await tx.assetSequence.upsert({
      where: { id: "singleton" },
      update: { sequence: { increment: 1 } },
      create: { id: "singleton", year: yearFull, sequence: 1 },
    });

    const padded = String(seq.sequence).padStart(5, "0");
    return `AST-${yearShort}${padded}`;
  });
}

// Helper: Check if year has changed since last sequence entry
async function shouldReset(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  type: "contract" | "renewal" | "asset",
  currentYear: number
): Promise<boolean> {
  const table = type === "contract"
    ? tx.contractSequence
    : type === "renewal"
    ? tx.renewalSequence
    : tx.assetSequence;

  const existing = await (table as typeof tx.contractSequence).findUnique({
    where: { id: "singleton" },
  });

  return !!existing && existing.year !== currentYear;
}
