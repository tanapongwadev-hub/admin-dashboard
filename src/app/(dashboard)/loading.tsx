import { ListPageSkeleton } from "@/components/layout/list-page-skeleton";

// Fallback for every dashboard route without its own loading.tsx.
export default function DashboardLoading() {
  return <ListPageSkeleton />;
}
