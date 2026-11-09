import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// All sign-in requests (sending codes, checking them, signing out) go here.
export const { GET, POST } = toNextJsHandler(auth);
