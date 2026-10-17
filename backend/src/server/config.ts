import { config } from "dotenv";
import { resolve } from "node:path";

// Read literal values (including '$') without printing credentials or expanding them.
config({ path: resolve(process.cwd(), "../.env"), quiet: true });
config({ path: resolve(process.cwd(), ".env"), quiet: true });

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
