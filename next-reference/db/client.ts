import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DbType = NodePgDatabase<typeof schema>;

let poolInstance: Pool | null = null;
let dbInstance: DbType | null = null;

function getDb(): DbType {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
    });
  }

  if (!dbInstance) {
    dbInstance = drizzle(poolInstance, { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof DbType];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

