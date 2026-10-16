import type { LucideIcon } from "lucide-react";

export type ManualCategoryId =
  | "getting-started"
  | "inventory"
  | "processing"
  | "production"
  | "engineering"
  | "sales"
  | "reports"
  | "system";

export interface ManualCategory {
  id: ManualCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface ManualStep {
  title: string;
  detail: string;
  /** Public path of a screenshot, e.g. /manuals/<slug>/01.jpg */
  image?: string;
  imageAlt?: string;
  /** What each numbered marker on the screenshot means, in marker order (marker 1 = first entry). */
  callouts?: string[];
}

export interface Manual {
  slug: string;
  category: ManualCategoryId;
  title: string;
  summary: string;
  /** Screen the manual describes; shown as an "open this screen" link. */
  href?: string;
  /** Who can use the screen, in plain words. */
  access?: string;
  steps: ManualStep[];
  tips?: string[];
  /** Slugs of manuals to read next. */
  related?: string[];
}
