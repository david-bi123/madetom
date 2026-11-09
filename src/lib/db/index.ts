import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function connectionConfig() {
  const url = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/madetom";
  const parsed = new URL(url);
  const sslEnabled =
    process.env.DATABASE_SSL === "true" || parsed.searchParams.get("ssl") === "true";

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    waitForConnections: true,
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 8),
    maxIdle: 8,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    timezone: "Z",
    charset: "utf8mb4",
    ...(sslEnabled ? { ssl: { minVersion: "TLSv1.2" as const, rejectUnauthorized: true } } : {}),
  };
}

function createDb() {
  const pool = mysql.createPool(connectionConfig());
  return drizzle(pool, { schema, mode: "default" });
}

const globalForDb = globalThis as unknown as { madetomDb?: Db };

export function getDb(): Db {
  if (!globalForDb.madetomDb) {
    globalForDb.madetomDb = createDb();
  }
  return globalForDb.madetomDb;
}

/**
 * Drizzle client. Created lazily through a proxy so importing this module never
 * opens a connection during build or when a route isn't executed.
 */
export const db = new Proxy({} as Db, {
  get(_target, property) {
    const instance = getDb();
    const value = instance[property as keyof Db];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Database = Db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
