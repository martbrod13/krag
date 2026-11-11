"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ConfirmButtonProps = {
  label: string;
  confirmLabel: string;
  cancelLabel: string;
};

/**
 * A submit button that asks once more before something is removed:
 * the first tap shows "Yes, remove" and "Cancel" next to each other.
 * Put it inside a form.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  cancelLabel,
}: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  if (!asking) {
    return (
      <Button variant="secondary" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap gap-2">
      <Button type="submit" variant="danger" disabled={pending}>
        {confirmLabel}
      </Button>
      <Button variant="secondary" onClick={() => setAsking(false)}>
        {cancelLabel}
      </Button>
    </span>
  );
}
