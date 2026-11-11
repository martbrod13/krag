import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getSession } from "@/lib/session";

// Shared frame of the signed-in pages: the top bar and a column that is
// phone-sized on phones and a little wider on computers.
export default async function PanelsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-2xl">
      <AppHeader signedIn={session !== null} />
      <main className="flex flex-1 flex-col gap-5 px-5 py-6">{children}</main>
    </div>
  );
}
