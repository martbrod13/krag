import { type NextRequest, NextResponse } from "next/server";
import { DEVICE_COOKIE, deviceCookieOptions } from "@/lib/device-cookie";

/**
 * Runs before the start page and the senior screen. The cookie of a paired
 * senior device gets another 400 days on every visit, so a phone or tablet
 * in daily use never has to be paired again.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(DEVICE_COOKIE)?.value;
  if (token) response.cookies.set(DEVICE_COOKIE, token, deviceCookieOptions);
  return response;
}

export const config = {
  matcher: ["/", "/senior/:path*"],
};
