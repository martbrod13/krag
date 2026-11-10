import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";
import { sendSignInCode } from "@/lib/email";

const DAY_IN_SECONDS = 60 * 60 * 24;

// Sign-in with one-time email codes. Accounts and sessions live in our own
// database; no outside sign-in service is involved.
// In production BETTER_AUTH_SECRET must be set (see .env.example).
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  session: {
    // Stay signed in on your own phone; a session ends after 30 days without use.
    expiresIn: 30 * DAY_IN_SECONDS,
    updateAge: DAY_IN_SECONDS,
  },
  telemetry: { enabled: false },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 3,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          await sendSignInCode(email, otp);
        }
      },
    }),
    // Lets server actions set and clear the sign-in cookie. Keep it last.
    nextCookies(),
  ],
});
