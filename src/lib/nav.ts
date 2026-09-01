import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  LineChart,
  Users,
  Package,
  ShoppingCart,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const primaryNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Analytics", href: "/dashboard/analytics", icon: LineChart },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart, badge: "New" },
];

export const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
