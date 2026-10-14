import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { pool, transaction } from "./db";
import { ApiError } from "./errors";

const scrypt = promisify(scryptCallback);
export const accountFields = "id, full_name, email, role, is_active, created_at, updated_at";
export type Account = { id: string; full_name: string; email: string; role: "admin" | "reviewer"; is_active: boolean };
export function accountDto(row: Account) { return { ...row, role: row.role === "reviewer" ? "user" : "admin" }; }
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [scheme, salt, key] = hash.split(":");
  if (scheme !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(key ?? "")) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function authenticate(request: Request, admin = false): Promise<Account> {
  const token = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
  if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  const { rows } = await pool().query(`SELECT ${accountFields.split(", ").map(f => `u.${f}`).join(", ")}
    FROM sellens_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active=true`, [tokenHash(token)]);
  if (!rows[0]) throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  if (admin && rows[0].role !== "admin") throw new ApiError(403, "FORBIDDEN", "Administrator access required");
  return rows[0];
}
export async function login(email: string, password: string) {
  // Database-backed attempts apply across processes; no credentials or emails in the key.
  const key = tokenHash(email);
  const attempt = await pool().query(`INSERT INTO sellens_login_limits (key, attempts, window_start)
    VALUES ($1,1,now()) ON CONFLICT (key) DO UPDATE SET
    attempts=CASE WHEN sellens_login_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE sellens_login_limits.attempts+1 END,
    window_start=CASE WHEN sellens_login_limits.window_start < now()-interval '15 minutes' THEN now() ELSE sellens_login_limits.window_start END
    RETURNING attempts`, [key]);
  if (attempt.rows[0].attempts > 20) throw new ApiError(429, "RATE_LIMITED", "Too many login attempts; try again later");
  const { rows } = await pool().query("SELECT * FROM users WHERE lower(email)=$1", [email]);
  // A dummy derivation prevents the obvious unknown-account timing distinction.
  const valid = await verifyPassword(password, rows[0]?.password_hash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!valid || !rows[0]?.is_active) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  return transaction(async client => {
    // Recheck after password derivation; suspension/password changes must not race login.
    const current = await client.query("SELECT * FROM users WHERE id=$1 FOR SHARE",[rows[0].id]);
    if (!current.rows[0]?.is_active || current.rows[0].password_hash !== rows[0].password_hash)
      throw new ApiError(401,"INVALID_CREDENTIALS","Invalid email or password");
    const token = randomBytes(32).toString("hex");
    await client.query("INSERT INTO sellens_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '24 hours')", [tokenHash(token), rows[0].id]);
    const { password_hash: _hash, ...account } = current.rows[0];
    void _hash;
    return { access_token: token, token_type: "Bearer", expires_in: 86400, account: accountDto(account) };
  });
}
