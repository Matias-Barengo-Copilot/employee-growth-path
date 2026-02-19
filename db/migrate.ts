import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

async function runMigrations() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations completed!");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

