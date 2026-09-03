"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { Material, PaginatedResult } from "@/lib/api/materials";

export function MaterialPcTable({
  materials,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
}: {
  materials: Material[];
  meta: PaginatedResult<Material>["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">No PC materials found</p>
        <p className="text-sm text-fg-muted">Try a different search or status filter.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Shape</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Suppliers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-medium text-fg">{material.code}</TableCell>
                <TableCell className="text-fg-secondary">{material.name}</TableCell>
                <TableCell className="text-fg-muted">
                  {material.materialType}
                  {material.ratio ? ` · ${material.ratio}` : ""}
                </TableCell>
                <TableCell className="text-fg-muted">{material.unit?.nameEn ?? material.unit?.code ?? "—"}</TableCell>
                <TableCell className="text-fg-muted">
                  {material.suppliers.length > 0 ? material.suppliers.length : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={material.isActive ? "success" : "neutral"} dot>
                    {material.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${material.name}`}
                        title="Edit"
                        onClick={() => onEdit(material)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={material.isActive ? `Disable ${material.name}` : `Enable ${material.name}`}
                        title={material.isActive ? "Disable" : "Enable"}
                        onClick={() => onToggleStatus(material)}
                        className={material.isActive ? "text-danger hover:bg-danger-soft hover:text-danger" : "text-success hover:bg-success-soft hover:text-success"}
                      >
                        {material.isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-fg-muted">
        <p>
          Page {meta.page} of {Math.max(1, meta.totalPages)} · {meta.totalItems} total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => goToPage(meta.page + 1)}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
