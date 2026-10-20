import { randomUUID } from "node:crypto";
import { allowedOrigins } from "./config";
import { pool } from "./db";
import { ApiError, missing } from "./errors";
import {
  authenticate,
  accountDto,
  login,
  tokenHash,
  type Account,
} from "./auth";
import {
  parse,
  body,
  pagination,
  id,
  nonempty,
  productSchema,
  categorySchema,
  accountSchema,
  loginSchema,
  analysisSchema,
  actionSchema,
  actionPatchSchema,
  productFilterSchema,
} from "./validation";
import * as catalog from "./services/catalog";
import * as analyses from "./services/analyses";
import * as actions from "./services/actions";

type Outcome = { body: unknown; status?: number };
type Context = {
  request: Request;
  url: URL;
  params: Record<string, string>;
  actor?: Account;
};
type Handler = (context: Context) => Promise<Outcome>;
type Route = { access: "public" | "user" | "admin"; handler: Handler };

function publicRoute(handler: Handler): Route {
  return { access: "public", handler };
}
function userRoute(handler: Handler): Route {
  return { access: "user", handler };
}
function adminRoute(handler: Handler): Route {
  return { access: "admin", handler };
}

// Read each endpoint as: HTTP method + URL -> access guard + named handler.
export const routes: Record<string, Route> = {
  "GET /api/v1/health": publicRoute(health),
  "GET /api/v1/ready": publicRoute(readiness),
  "POST /api/v1/auth/login": publicRoute(loginAccount),
  "GET /api/v1/auth/me": userRoute(currentAccount),
  "POST /api/v1/auth/logout": userRoute(logoutAccount),

  "GET /api/v1/products": userRoute(listProducts),
  "POST /api/v1/products/import": userRoute(importProducts),
  "GET /api/v1/products/:id": userRoute(getProduct),
  "POST /api/v1/products": adminRoute(createProduct),
  "PATCH /api/v1/products/:id": adminRoute(updateProduct),
  "DELETE /api/v1/products/:id": adminRoute(deleteProduct),
  "GET /api/v1/products/:id/analyses": userRoute(listProductAnalyses),

  "GET /api/v1/categories": userRoute(listCategories),
  "GET /api/v1/categories/:id": userRoute(getCategory),
  "POST /api/v1/categories": adminRoute(createCategory),
  "PATCH /api/v1/categories/:id": adminRoute(updateCategory),
  "DELETE /api/v1/categories/:id": adminRoute(deleteCategory),

  "GET /api/v1/analyses": userRoute(listAnalyses),
  "GET /api/v1/analyses/:id": userRoute(getAnalysis),
  "POST /api/v1/analyses": adminRoute(createAnalysis),
  "GET /api/v1/analyses/:id/actions": userRoute(listAnalysisActions),
  "GET /api/v1/analysis-results": userRoute(listAnalyses),
  "GET /api/v1/analysis-results/:id": userRoute(getAnalysis),
  "POST /api/v1/analysis-results": adminRoute(createAnalysis),
  "GET /api/v1/analysis-results/:id/actions": userRoute(listAnalysisActions),

  "GET /api/v1/actions": userRoute(listActions),
  "GET /api/v1/actions/:id": userRoute(getAction),
  "POST /api/v1/actions": userRoute(createAction),
  "PATCH /api/v1/actions/:id": userRoute(updateAction),
  "GET /api/v1/actions/:id/history": userRoute(listActionHistory),

  "GET /api/v1/accounts": adminRoute(listAccounts),
  "GET /api/v1/accounts/:id": adminRoute(getAccount),
  "POST /api/v1/accounts": adminRoute(createAccount),
  "PATCH /api/v1/accounts/:id": adminRoute(updateAccount),
  "DELETE /api/v1/accounts/:id": adminRoute(suspendAccount),
  "GET /api/v1/admin/accounts": adminRoute(listAccounts),
  "GET /api/v1/admin/accounts/:id": adminRoute(getAccount),
  "POST /api/v1/admin/accounts": adminRoute(createAccount),
  "PATCH /api/v1/admin/accounts/:id": adminRoute(updateAccount),
  "DELETE /api/v1/admin/accounts/:id": adminRoute(suspendAccount),
};

// Endpoint handlers: HTTP input/output only; business logic remains in services.
async function health(): Promise<Outcome> {
  return { body: { status: "ok" } };
}
async function readiness(): Promise<Outcome> {
  try {
    await pool().query("SELECT 1");
    return { body: { status: "ready", database: "connected" } };
  } catch {
    throw new ApiError(503, "NOT_READY", "Database unavailable");
  }
}
async function loginAccount({ request }: Context): Promise<Outcome> {
  const input = parse(loginSchema, await body(request));
  return { body: { data: await login(input.email, input.password) } };
}
async function currentAccount({ actor }: Context): Promise<Outcome> {
  return { body: { data: accountDto(actor!) } };
}
async function logoutAccount({ request }: Context): Promise<Outcome> {
  await pool().query("DELETE FROM sellens_sessions WHERE token_hash=$1", [
    tokenHash(request.headers.get("authorization")!.slice(7)),
  ]);
  return { body: { data: { logged_out: true } } };
}
async function listProducts({ url }: Context): Promise<Outcome> {
  const { page, limit } = pagination(url);

  const rawParams = {
    search: url.searchParams.get("search") ?? undefined,
    category_id: url.searchParams.get("category_id") ?? undefined,
    min_price: url.searchParams.get("min_price") ?? undefined,
    max_price: url.searchParams.get("max_price") ?? undefined,
    min_sold: url.searchParams.get("min_sold") ?? undefined,
    min_rating: url.searchParams.get("min_rating") ?? undefined,
  };

  const filters = parse(productFilterSchema, rawParams);

  return {
    body: await catalog.listProducts(page, limit, {
      search: filters.search,
      categoryId: filters.category_id,
      minPrice: filters.min_price,
      maxPrice: filters.max_price,
      minSold: filters.min_sold,
      minRating: filters.min_rating,
    }),
  };
}
async function getProduct({ params }: Context): Promise<Outcome> {
  return { body: { data: await catalog.getRecord("products", params.id) } };
}
async function createProduct({ request, actor }: Context): Promise<Outcome> {
  return {
    body: {
      data: await catalog.createProduct(
        parse(productSchema, await body(request)),
        actor!,
      ),
    },
    status: 201,
  };
}

async function importProducts({ request, actor }: Context): Promise<Outcome> {
  const payload = await body(request);
  const items = Array.isArray(payload)
    ? payload
    : (payload as { items: unknown[] })?.items;
  return {
    body: {
      data: await catalog.importProducts(
        items as Array<Record<string, unknown>>,
        actor!,
      ),
    },
    status: 201,
  };
}

async function updateProduct({ request, params }: Context): Promise<Outcome> {
  const fields = parse(productSchema.partial(), await body(request));
  nonempty(fields);
  return {
    body: { data: await catalog.update(pool(), "products", params.id, fields) },
  };
}
async function deleteProduct({ params }: Context): Promise<Outcome> {
  return { body: { data: await catalog.deleteRecord("products", params.id) } };
}
async function listProductAnalyses({ url, params }: Context): Promise<Outcome> {
  await catalog.getRecord("products", params.id);
  const { page, limit } = pagination(url);
  return { body: await analyses.listAnalyses(page, limit, params.id) };
}
async function listCategories({ url }: Context): Promise<Outcome> {
  const { page, limit } = pagination(url);
  return { body: await catalog.listRecords("categories", page, limit) };
}
async function getCategory({ params }: Context): Promise<Outcome> {
  return { body: { data: await catalog.getRecord("categories", params.id) } };
}
async function createCategory({ request }: Context): Promise<Outcome> {
  return {
    body: {
      data: await catalog.createCategory(
        parse(categorySchema, await body(request)),
      ),
    },
    status: 201,
  };
}
async function updateCategory({ request, params }: Context): Promise<Outcome> {
  const fields = parse(categorySchema.partial(), await body(request));
  nonempty(fields);
  return { body: { data: await catalog.patchCategory(params.id, fields) } };
}
async function deleteCategory({ params }: Context): Promise<Outcome> {
  return {
    body: { data: await catalog.deleteRecord("categories", params.id) },
  };
}
function optionalFilter(url: URL, field: string) {
  const value = url.searchParams.get(field) ?? undefined;
  return value ? parse(id, value) : undefined;
}
async function listAnalyses({ url }: Context): Promise<Outcome> {
  const { page, limit } = pagination(url);
  return {
    body: await analyses.listAnalyses(
      page,
      limit,
      optionalFilter(url, "product_id"),
    ),
  };
}
async function getAnalysis({ params }: Context): Promise<Outcome> {
  return { body: { data: await analyses.getAnalysis(params.id) } };
}
async function createAnalysis({ request, actor }: Context): Promise<Outcome> {
  return {
    body: {
      data: await analyses.createAnalysis(
        parse(analysisSchema, await body(request)),
        actor!,
      ),
    },
    status: 201,
  };
}
async function listAnalysisActions({ url, params }: Context): Promise<Outcome> {
  await analyses.getAnalysis(params.id);
  const { page, limit } = pagination(url);
  return { body: await actions.listActions(page, limit, params.id) };
}
async function listActions({ url }: Context): Promise<Outcome> {
  const { page, limit } = pagination(url);
  return {
    body: await actions.listActions(
      page,
      limit,
      optionalFilter(url, "analysis_id"),
    ),
  };
}
async function getAction({ params }: Context): Promise<Outcome> {
  return { body: { data: await actions.getAction(params.id) } };
}
async function createAction({ request, actor }: Context): Promise<Outcome> {
  return {
    body: {
      data: await actions.createAction(
        parse(actionSchema, await body(request)),
        actor!,
      ),
    },
    status: 201,
  };
}
async function updateAction({
  request,
  params,
  actor,
}: Context): Promise<Outcome> {
  return {
    body: {
      data: await actions.patchAction(
        params.id,
        parse(actionPatchSchema, await body(request)),
        actor!,
      ),
    },
  };
}
async function listActionHistory({ url, params }: Context): Promise<Outcome> {
  const { page, limit } = pagination(url);
  return { body: await actions.history(params.id, page, limit) };
}
async function listAccounts({ url }: Context): Promise<Outcome> {
  const { page, limit } = pagination(url);
  return { body: await catalog.listRecords("users", page, limit) };
}
async function getAccount({ params }: Context): Promise<Outcome> {
  return { body: { data: await catalog.getRecord("users", params.id) } };
}
async function createAccount({ request }: Context): Promise<Outcome> {
  return {
    body: {
      data: await catalog.createAccount(
        parse(accountSchema, await body(request)),
      ),
    },
    status: 201,
  };
}
async function updateAccount({ request, params }: Context): Promise<Outcome> {
  const fields = parse(accountSchema.partial(), await body(request));
  nonempty(fields);
  return { body: { data: await catalog.patchAccount(params.id, fields) } };
}
async function suspendAccount({ params }: Context): Promise<Outcome> {
  return {
    body: { data: await catalog.patchAccount(params.id, { is_active: false }) },
  };
}

function matchPath(
  pattern: string,
  path: string[],
): Record<string, string> | undefined {
  const segments = pattern.slice("/api/v1/".length).split("/");
  if (segments.length !== path.length) return undefined;
  const params: Record<string, string> = {};
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment.startsWith(":")) params[segment.slice(1)] = path[index];
    else if (segment !== path[index]) return undefined;
  }
  return params;
}
async function dispatch(request: Request, path: string[]): Promise<Outcome> {
  const matches = Object.entries(routes).flatMap(([endpoint, route]) => {
    const [method, pattern] = endpoint.split(" ");
    const params = matchPath(pattern, path);
    return params ? [{ method, route, params }] : [];
  });
  if (!matches.length) missing();
  const selected = matches.find((match) => match.method === request.method);
  const fallback = matches[0];
  // Unsupported mutations still enforce the same account/admin boundary before 405.
  const access =
    selected?.route.access ??
    (fallback.route.access === "public"
      ? "public"
      : [
            "products",
            "categories",
            "analyses",
            "analysis-results",
            "accounts",
            "admin",
          ].includes(path[0]) && request.method !== "GET"
        ? "admin"
        : fallback.route.access);
  const actor =
    access === "public"
      ? undefined
      : await authenticate(request, access === "admin");
  const params = selected?.params ?? fallback.params;
  if (params.id) parse(id, params.id);
  if (!selected)
    throw new ApiError(
      405,
      "METHOD_NOT_ALLOWED",
      "Method not allowed for this resource",
    );
  return selected.route.handler({
    request,
    url: new URL(request.url),
    params,
    actor,
  });
}
export async function handle(request: Request, path: string[]) {
  const requestId = randomUUID();
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Request-Id": requestId,
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    if (origin) {
      if (!allowedOrigins().includes(origin))
        throw new ApiError(403, "ORIGIN_DENIED", "Origin is not allowed");
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type";
    }
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const result = await dispatch(request, path);
    return Response.json(result.body, {
      status: result.status ?? 200,
      headers,
    });
  } catch (error) {
    let safe: ApiError;
    const dbCode = (error as { code?: string })?.code;
    if (error instanceof ApiError) safe = error;
    else if (dbCode === "23505")
      safe = new ApiError(
        409,
        "CONFLICT",
        "A record with that unique value already exists",
      );
    else if (dbCode === "23503" || dbCode === "23001")
      safe = new ApiError(
        409,
        "RELATION_CONFLICT",
        "Related record is missing or still referenced",
      );
    else if (["23514", "22003", "22001", "22P02"].includes(dbCode ?? ""))
      safe = new ApiError(
        422,
        "VALIDATION_ERROR",
        "Input violates a data constraint",
      );
    else {
      console.error(`Request ${requestId} failed`);
      safe = new ApiError(500, "INTERNAL_ERROR", "Unable to complete request");
    }
    return Response.json(
      {
        error: {
          code: safe.code,
          message: safe.message,
          ...(safe.details ? { details: safe.details } : {}),
          request_id: requestId,
        },
      },
      { status: safe.status, headers },
    );
  }
}
