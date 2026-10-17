import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION = "sellens-session";
type Context = { params: Promise<{ path: string[] }> };
function error(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
async function proxy(request: Request, context: Context) {
  const { path } = await context.params;
  if (
    !path.length ||
    path.some(
      (segment) => segment === "." || segment === ".." || segment.includes("/"),
    )
  )
    return error(404, "NOT_FOUND", "Endpoint unavailable");
  const origin = request.headers.get("origin");
  // Next.js may use an internal hostname in request.url; use the received Host,
  // or an explicitly configured public origin behind an HTTPS reverse proxy.
  const publicOrigin =
    process.env.FRONTEND_ORIGIN ??
    `${new URL(request.url).protocol}//${request.headers.get("host") ?? new URL(request.url).host}`;
  try {
    if (origin && new URL(origin).origin !== new URL(publicOrigin).origin)
      return error(403, "ORIGIN_DENIED", "Origin is not allowed");
  } catch {
    return error(403, "ORIGIN_DENIED", "Origin is not allowed");
  }
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return error(403, "ORIGIN_DENIED", "Origin is not allowed");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION)?.value;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.text();
    if (Buffer.byteLength(body) > 262144)
      return error(
        413,
        "PAYLOAD_TOO_LARGE",
        "JSON body must be at most 256 KiB",
      );
    headers["Content-Type"] =
      request.headers.get("content-type") ?? "application/json";
  }
  try {
    const base = process.env.BACKEND_API_URL ?? "http://127.0.0.1:3001/api/v1";
    const target = `${base.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await upstream.json();
    const isLogin = path.join("/") === "auth/login";
    let accessToken: string | undefined;
    if (isLogin && upstream.ok) {
      accessToken = payload.data.access_token;
      delete payload.data.access_token;
      delete payload.data.token_type;
    }
    const response = NextResponse.json(payload, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
    if (accessToken)
      response.cookies.set(SESSION, accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(publicOrigin).protocol === "https:",
        path: "/",
        maxAge: 86400,
      });
    if (
      (!isLogin && upstream.status === 401) ||
      (path.join("/") === "auth/logout" && upstream.ok)
    )
      response.cookies.delete(SESSION);
    return response;
  } catch {
    return error(
      503,
      "BACKEND_UNAVAILABLE",
      "Backend unavailable; please retry",
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
