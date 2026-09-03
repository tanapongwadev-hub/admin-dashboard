"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { LayoutGrid, LineChart, Users, Package, ShoppingCart, Settings, Plus, Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg-muted transition-colors hover:border-border-strong hover:bg-surface-2"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to...</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global command menu"
        overlayClassName="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        contentClassName="fixed left-1/2 top-[20%] z-[100] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-fg-muted" />
          <Command.Input
            placeholder="Type a command or search..."
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-fg-muted">No results found.</Command.Empty>

          <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-muted">
            <Item icon={LayoutGrid} onSelect={() => go("/dashboard")}>Overview</Item>
            <Item icon={LineChart} onSelect={() => go("/analytics")}>Analytics</Item>
            <Item icon={Users} onSelect={() => go("/users")}>Users</Item>
            <Item icon={Package} onSelect={() => go("/products")}>Products</Item>
            <Item icon={ShoppingCart} onSelect={() => go("/orders")}>Orders</Item>
            <Item icon={Settings} onSelect={() => go("/settings")}>Settings</Item>
          </Command.Group>

          <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-muted">
            <Item icon={Plus} onSelect={() => go("/users?new=1")}>Invite user</Item>
            <Item icon={Plus} onSelect={() => go("/products?new=1")}>Add product</Item>
            <Item
              icon={resolvedTheme === "dark" ? Sun : Moon}
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
            >
              Toggle theme
            </Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg-secondary",
        "data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Command.Item>
  );
}
