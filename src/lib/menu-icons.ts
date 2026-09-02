import {
  LayoutDashboard,
  Menu,
  Shield,
  Briefcase,
  Key,
  Tag,
  Building,
  XCircle,
  Clock,
  Ruler,
  Truck,
  Box,
  MapPin,
  FolderTree,
  Users,
  Store,
  Scissors,
  FileBarChart,
  PackagePlus,
  ShieldCheck,
  UserCog,
  Car,
  GitBranch,
  Database,
  Gauge,
  BookOpen,
  Hammer,
  Bookmark,
  FileText,
  Circle,
  type LucideIcon,
} from "lucide-react";
import type { MenuNode } from "./api/auth";

// Maps cps-api's Menu.icon (kebab-case, e.g. "layout-dashboard") to a Lucide
// component. Source of truth for values: cps-api/src/database/seeds/seed.ts.
// Add an entry here whenever a new menu icon shows up in the backend —
// unmapped names fall back to a plain dot rather than bundling every Lucide
// icon just to cover names we haven't seen yet.
const MENU_ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  menu: Menu,
  shield: Shield,
  briefcase: Briefcase,
  key: Key,
  tag: Tag,
  building: Building,
  "x-circle": XCircle,
  clock: Clock,
  ruler: Ruler,
  truck: Truck,
  box: Box,
  "map-pin": MapPin,
  "folder-tree": FolderTree,
  users: Users,
  store: Store,
  scissors: Scissors,
  "file-bar-chart": FileBarChart,
  "package-plus": PackagePlus,
  "shield-check": ShieldCheck,
  "user-cog": UserCog,
  car: Car,
  "git-branch": GitBranch,
  database: Database,
  gauge: Gauge,
  "book-open": BookOpen,
  hammer: Hammer,
  bookmark: Bookmark,
  "file-text": FileText,
};

export function menuIcon(name: string | null): LucideIcon {
  if (!name) return Circle;
  return MENU_ICONS[name] ?? Circle;
}

// A MenuNode with its icon string pre-resolved to an actual component.
// Resolve once per menu tree (e.g. via useMemo) and pass the result down as
// props — picking an icon via menuIcon() directly inside a component that
// also renders <Icon /> trips the React Compiler's "components created
// during render" check, since it can't prove the lookup is stable.
export interface ResolvedMenuNode {
  id: string;
  name: string;
  path: string | null;
  menuType: "MAIN" | "SUB" | "BUTTON";
  Icon: LucideIcon;
  children: ResolvedMenuNode[];
}

export function resolveMenuIcons(nodes: MenuNode[]): ResolvedMenuNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    path: node.path,
    menuType: node.menuType,
    Icon: menuIcon(node.icon),
    children: resolveMenuIcons(node.children),
  }));
}
