/**
 * Ensure demo tenant + seed data exist in Postgres.
 * Usage: npm run seed
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvFile(file: string) {
  const p = path.join(process.cwd(), file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

import { ensureSeeded } from "../src/lib/db/seed";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Start Postgres (docker compose up -d) and set DATABASE_URL in .env.local",
    );
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && process.env.SEED_CONFIRM !== "yes") {
    console.error(
      "Refusing to seed demo data against a production database.\n" +
        "This creates a demo tenant with a known/default admin login.\n" +
        "If you really want this (e.g. first-time production bootstrap), re-run with SEED_CONFIRM=yes.",
    );
    process.exit(1);
  }
  await ensureSeeded();
  const [tenants, products, faqs, users] = await Promise.all([
    prisma.tenant.count(),
    prisma.product.count(),
    prisma.faqItem.count(),
    prisma.user.count(),
  ]);
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo" } });
  console.log("ReplyPilot AI Postgres ready.");
  console.log("  tenants:", tenants);
  console.log("  products:", products);
  console.log("  faq:", faqs);
  console.log("  users:", users);
  console.log("  demo tenant:", tenant?.id || "(missing)");
  console.log(
    "  login: admin@demo.replypilot.local / ADMIN_PASSWORD or facetai-demo",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
