import type { ReactNode } from "react";
import { InstallOfferListener } from "@/components/senior/install-app";

// The senior's frame: big letters, a lot of space and nothing to get lost in.
// No header and no sign-out: the senior has no account.
export default function SeniorLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 py-8 text-xl">
      <InstallOfferListener />
      {children}
    </main>
  );
}
