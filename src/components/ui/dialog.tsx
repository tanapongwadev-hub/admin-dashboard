"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogSizes = {
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    // Only meaningful together with fullScreenOnMobile — the default
    // (unset) path below is untouched from its original fixed max-w-lg.
    size?: keyof typeof dialogSizes;
    // Full-screen sheet on mobile, centered dialog from `sm:` up — opt-in so
    // existing call sites (which expect the always-centered small dialog)
    // are unaffected. Pure CSS breakpoint, no JS viewport detection/hydration risk.
    fullScreenOnMobile?: boolean;
  }
>(({ className, children, size = "lg", fullScreenOnMobile = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        fullScreenOnMobile
          ? cn(
              "fixed z-50 flex flex-col border-border bg-surface shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "inset-0 h-dvh w-full max-h-none overflow-y-auto border-0 rounded-none",
              // Only top/left (not inset-1/2, which also sets right/bottom —
              // with `position: fixed` that pins both edges and collapses
              // the computed height to 0, since height:auto doesn't override
              // a fully-constrained top+bottom box). Centering comes from
              // the translate, same technique as the non-fullScreenOnMobile
              // branch below.
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border data-[state=closed]:sm:zoom-out-95 data-[state=open]:sm:zoom-in-95",
              dialogSizes[size]
            )
          : "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-fg-muted opacity-70 transition-opacity hover:opacity-100 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">ปิด</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 px-6 pt-6 pb-4 border-b border-border", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-end gap-2 px-6 py-4 border-t border-border", className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold text-fg", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-fg-muted", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
