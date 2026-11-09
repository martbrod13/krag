import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Used by forms in the browser (client components) to request and check codes.
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
