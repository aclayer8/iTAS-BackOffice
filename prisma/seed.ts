import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const SALT_ROUNDS = 12;

  const users = [
    {
      email: "admin@itas.co.th",
      name: "System Admin",
      password: "Admin@1234!",
      role: "ADMIN" as const,
    },
    {
      email: "sale@itas.co.th",
      name: "Sale User",
      password: "Sale@1234!",
      role: "SALE" as const,
    },
    {
      email: "engineer@itas.co.th",
      name: "Engineer User",
      password: "Engineer@1234!",
      role: "ENGINEER" as const,
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
    console.log(`  ✅ ${u.role}: ${user.email} (password: ${u.password})`);
  }

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
