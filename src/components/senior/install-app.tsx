"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// Android browsers offer to add the app to the home screen with the
// "beforeinstallprompt" event. The offer comes once per page load, often
// while the family is still on the pairing page, so it is kept here until
// the "ready" page shows the button.

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

let offer: InstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (!listening) {
    listening = true;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      offer = event as InstallPromptEvent;
      notify();
    });
    window.addEventListener("appinstalled", () => {
      offer = null;
      notify();
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getOffer() {
  return offer;
}

function noOfferOnServer() {
  return null;
}

async function install() {
  const current = offer;
  offer = null;
  notify();
  await current?.prompt();
}

function useInstallOffer() {
  return useSyncExternalStore<InstallPromptEvent | null>(
    subscribe,
    getOffer,
    noOfferOnServer,
  );
}

/** Listens for the browser's offer on every senior page. Renders nothing. */
export function InstallOfferListener() {
  useInstallOffer();
  return null;
}

/** "Add to home screen" button, shown only when the browser offers it. */
export function InstallButton({ label }: { label: string }) {
  const available = useInstallOffer() !== null;
  if (!available) return null;
  return (
    <Button size="lg" onClick={() => void install()}>
      {label}
    </Button>
  );
}
