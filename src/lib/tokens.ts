import { createHash, randomBytes } from "node:crypto";

/** A new random secret (256 bits) for a link, a QR code or a device cookie. */
export function newToken() {
  return randomBytes(32).toString("base64url");
}

/**
 * Only this hash goes into the database. The token itself exists only in the
 * link or the cookie, so a copy of the database opens no circle.
 */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
