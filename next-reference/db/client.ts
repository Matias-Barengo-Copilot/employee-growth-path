import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Lazy initialization to prevent build-time connection attempts
// During Next.js build, DATABASE_URL might not be available
let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  // If already initialized, return the instance
  if (dbInstance) {
    return dbInstance;
  }

  // During build time, use a dummy connection string
  // This prevents build failures when DATABASE_URL is not set
  const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  // Initialize pool only when needed
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
    });
  }

  // Initialize drizzle instance
  if (!dbInstance) {
    dbInstance = drizzle(poolInstance, { schema });
  }

  return dbInstance;
}

// Export a proxy that lazily initializes the db instance
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof ReturnType<typeof drizzle>];
    // If it's a function, bind it to the instance
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

