import { handle } from "@/server/api";

type Context = { params: Promise<{ path: string[] }> };
async function route(request: Request, context: Context) {
  return handle(request, (await context.params).path);
}
export {
  route as GET,
  route as POST,
  route as PATCH,
  route as DELETE,
  route as PUT,
  route as OPTIONS,
  route as HEAD,
};
