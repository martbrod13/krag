"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareLinkProps = {
  link: string;
  /** Title and text for the phone's share sheet (WhatsApp, SMS, e-mail). */
  title: string;
  text: string;
  labels: { share: string; copy: string; copied: string };
};

/** "Share" opens the phone's share sheet; "Copy" puts the link on the clipboard. */
export function ShareLink({ link, title, text, labels }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Copying can be blocked; the link stays visible on the page.
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: link });
      } catch {
        // The person closed the share sheet.
      }
      return;
    }
    await copy();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={() => void share()}>
        {labels.share}
      </Button>
      <Button size="lg" variant="secondary" onClick={() => void copy()}>
        {copied ? labels.copied : labels.copy}
      </Button>
    </div>
  );
}
