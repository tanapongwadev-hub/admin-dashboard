"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Matches dialog.tsx's overlay (same scrim + slight blur) so the two
      // overlay surfaces in the app don't read as different materials.
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    // Screen-reader name for the panel. Radix requires a Title inside Dialog
    // content; this renders one `sr-only` so the visual design is unaffected.
    title?: string;
  }
>(({ className, children, title = "เมนูนำทาง", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // A floating rounded panel inset from the viewport edges, matching the
        // dashboard's floating-box shell (see AGENTS.md § Dashboard shell) —
        // not a flush edge-to-edge drawer. Height comes from the top/bottom
        // insets, so no `h-full` (which would resolve to the full viewport and
        // overflow past the bottom inset).
        "fixed inset-y-2 left-2 z-50 flex w-[17rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-0 shadow-2xl",
        "sm:inset-y-3 sm:left-3 sm:max-w-[calc(100vw-1.5rem)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-200 ease-out",
        className
      )}
      {...props}
    >
      <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">ปิด</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

export { Sheet, SheetTrigger, SheetContent, SheetClose };
