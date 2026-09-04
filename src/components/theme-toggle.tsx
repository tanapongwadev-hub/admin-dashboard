"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- required to avoid hydration mismatch with next-themes
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="สลับธีม" className="text-fg-secondary" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-fg-secondary"
      aria-label="สลับธีม"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
