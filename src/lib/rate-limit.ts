import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Fixed-window limiter backed by the shared database. Safe across serverless
 * instances (unlike in-memory counters).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const windowCutoff = new Date(now.getTime() - windowSeconds * 1000);
  const normalizedKey = key.slice(0, 191);

  await db.execute(sql`
    INSERT INTO rate_limits (\`key\`, \`count\`, \`window_start\`, \`expires_at\`)
    VALUES (${normalizedKey}, 1, ${now}, ${expiresAt})
    ON DUPLICATE KEY UPDATE
      \`count\` = IF(\`window_start\` < ${windowCutoff}, 1, \`count\` + 1),
      \`window_start\` = IF(\`window_start\` < ${windowCutoff}, ${now}, \`window_start\`),
      \`expires_at\` = ${expiresAt}
  `);

  const [rows] = await db.execute<{ count: number }>(
    sql`SELECT \`count\` FROM rate_limits WHERE \`key\` = ${normalizedKey} LIMIT 1`,
  );
  const row = (rows as unknown as Array<{ count: number }>)[0];
  const count = Number(row?.count ?? 1);
  return { allowed: count <= limit, remaining: Math.max(limit - count, 0) };
}

export async function clearRateLimit(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE \`key\` = ${key.slice(0, 191)}`);
}
