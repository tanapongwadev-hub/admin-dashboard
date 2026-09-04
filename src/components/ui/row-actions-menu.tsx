"use client";

import * as React from "react";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  // "danger" is for a destructive-leaning action (disable, cancel, delete) —
  // gets red text and a separator above it. "default" is everything else
  // (view, edit, mark as shipped, enable/restore) even when it flips a
  // disabled row back on, since re-enabling isn't destructive.
  variant?: "default" | "danger";
}

// Shared row-actions trigger for data tables and cards: one Meatballs
// (Ellipsis) icon button with an accessible label naming the row, opening a
// menu that groups normal actions above a separator from danger ones. Used
// by materials PC (table + card), products, users, and orders so the pattern
// (icon, grouping, hiding) can't drift between resources.
export function RowActionsMenu({
  actions,
  itemLabel,
}: {
  actions: RowAction[];
  // Identifies the row for screen readers, e.g. a material/product/user name
  // or an order id — combined into the trigger's aria-label.
  itemLabel: string;
}) {
  if (actions.length === 0) return null;

  const normalActions = actions.filter((action) => action.variant !== "danger");
  const dangerActions = actions.filter((action) => action.variant === "danger");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`ตัวเลือกสำหรับ ${itemLabel}`}
          className="h-8 w-8 text-fg-muted"
        >
          <Ellipsis className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {normalActions.map((action) => (
          <DropdownMenuItem key={action.label} onSelect={action.onSelect}>
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </DropdownMenuItem>
        ))}
        {normalActions.length > 0 && dangerActions.length > 0 && <DropdownMenuSeparator />}
        {dangerActions.map((action) => (
          <DropdownMenuItem key={action.label} destructive onSelect={action.onSelect}>
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
