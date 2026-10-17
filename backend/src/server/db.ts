import { Pool, type PoolClient } from "pg";
import { requiredEnv } from "./config";

const globalDb = globalThis as unknown as { sellensPool?: Pool };
export function pool(): Pool {
  if (!globalDb.sellensPool) {
    const connectionString = requiredEnv("DATABASE_URL");
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new Error("DATABASE_URL must be a PostgreSQL URI");
    globalDb.sellensPool = new Pool({
      connectionString, // Pass the supplied URI unchanged, including SSL parameters.
      enableChannelBinding: true,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
      application_name: "sellens-backend",
    });
    globalDb.sellensPool.on("error", () => {
      console.error("Database pool connection failed");
    });
  }
  return globalDb.sellensPool;
}

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
