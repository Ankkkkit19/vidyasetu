import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function isCloudDatabase(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch {
    return false;
  }
}

function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const ssl = isCloudDatabase(databaseUrl)
    ? { rejectUnauthorized: false }
    : false;
  const pool = new Pool({ connectionString: databaseUrl, ssl });
  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return pool;
}

export const db = drizzle(getPool());
