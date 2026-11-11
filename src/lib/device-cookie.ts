/**
 * Cookie with the secret token of the care recipient's paired phone or tablet
 * (docs/mapa-danych.md, section 9). Browsers keep a cookie for at most
 * 400 days; src/proxy.ts renews it on every visit, so a device in use stays
 * paired until the family unpairs it.
 */
export const DEVICE_COOKIE = "krag_device";

const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const deviceCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
} as const;
