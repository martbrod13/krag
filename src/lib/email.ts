import { appendFile } from "node:fs/promises";

// Sends one-time sign-in codes. An email provider (with servers in the EU) will
// be chosen before the beta. Until then the code is shown in the VS Code
// terminal in development, and it never leaves the server.
export async function sendSignInCode(email: string, code: string) {
  // Automated checks on GitHub read the codes from a file instead of an inbox.
  const testCodeLog = process.env.KRAG_TEST_CODE_LOG;
  if (testCodeLog) {
    await appendFile(testCodeLog, `${JSON.stringify({ email, code })}\n`);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n  Kod logowania dla ${email}: ${code}\n`);
    return;
  }

  throw new Error("Sending emails is not configured yet.");
}
