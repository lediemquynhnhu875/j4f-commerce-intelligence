import { NextResponse } from "next/server";

// Reject retired URLs before React streaming can commit a successful HTTP status.
export function proxy() {
  return new NextResponse("Not Found", { status: 404 });
}

export const config = {
  matcher: ["/preview/:path*", "/admin/products/:path*", "/admin/categories/:path*"],
};
