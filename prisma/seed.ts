import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const SALT_ROUNDS = 12;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be set and contain at least 12 characters");
  }

  const users = [
    {
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@itas.co.th",
      name: "System Admin",
      password: adminPassword,
      role: "ADMIN" as const,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, status: "ACTIVE" },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        status: "ACTIVE",
      },
    });
    console.log(`  ✅ ${u.role}: ${user.email}`);
  }

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
