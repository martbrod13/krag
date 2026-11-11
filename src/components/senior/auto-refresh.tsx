"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fetches the page again every few seconds while it is on screen, and when
 * the senior comes back to it. That way a number the family adds appears on
 * the senior's phone or tablet by itself.
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") router.refresh();
    }
    const timer = window.setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  return null;
}
