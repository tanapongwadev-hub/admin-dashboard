"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const iconStyles = {
  danger: "bg-danger-soft text-danger",
  default: "bg-primary-soft text-primary",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  variant = "danger",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  // "danger" for destructive actions (red icon/button, the original
  // behavior every existing call site relies on); "default" for
  // non-destructive confirmations (e.g. re-enabling a disabled record).
  variant?: keyof typeof iconStyles;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconStyles[variant]}`}>
            {variant === "danger" ? <AlertTriangle className="h-4.5 w-4.5" /> : <RotateCcw className="h-4.5 w-4.5" />}
          </span>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1">{description}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
