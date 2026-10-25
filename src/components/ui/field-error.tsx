import * as React from "react";
import { cn } from "@/lib/utils";

// The one place a field-level validation message is rendered: a <span> directly
// under the control. Pass `message` (renders nothing when empty) and give the
// control `aria-invalid` / `aria-describedby={id}` so screen readers link them.
export function FieldError({
  id,
  message,
  className,
}: {
  id?: string;
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className={cn("block text-xs text-danger", className)}>
      {message}
    </span>
  );
}
