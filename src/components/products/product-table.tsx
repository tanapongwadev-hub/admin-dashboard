"use client";

import * as React from "react";
import { Search, Plus, Trash2, Download, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProductColumns } from "@/components/products/columns";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { products as initialProducts } from "@/lib/data";
import type { Product, ProductStatus } from "@/lib/types";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

const categories = ["Apparel", "Electronics", "Home & Living", "Beauty", "Sporting Goods", "Stationery"];

const statusVariant: Record<ProductStatus, NonNullable<BadgeProps["variant"]>> = {
  "In stock": "success",
  "Low stock": "warning",
  "Out of stock": "danger",
  Draft: "neutral",
};

function deriveStatus(stock: number): ProductStatus {
  if (stock === 0) return "Out of stock";
  if (stock < 25) return "Low stock";
  return "In stock";
}

export function ProductsTable({ openNew }: { openNew?: boolean }) {
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Product[]>([]);
  const [view, setView] = React.useState<"table" | "grid">("table");

  const [formOpen, setFormOpen] = React.useState(!!openNew);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const columns = React.useMemo(
    () =>
      getProductColumns({
        onEdit: (p) => {
          setEditingProduct(p);
          setFormOpen(true);
        },
        onDelete: (p) => setDeleteTarget(p),
      }),
    []
  );

  const filteredData = React.useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, categoryFilter, statusFilter, search]);

  function handleSave(values: { name: string; sku: string; category: string; price: number; stock: number }, existing?: Product | null) {
    const status = deriveStatus(values.stock);
    if (existing) {
      setProducts((prev) => prev.map((p) => (p.id === existing.id ? { ...p, ...values, status, updated: new Date().toISOString() } : p)));
    } else {
      const newProduct: Product = {
        ...values,
        status,
        id: `PRD-${Math.floor(Math.random() * 9000 + 1000)}`,
        sales: 0,
        updated: new Date().toISOString(),
      };
      setProducts((prev) => [newProduct, ...prev]);
    }
  }

  function handleDelete(product: Product) {
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success("Product deleted", { description: `${product.name} was removed from the catalog.` });
  }

  function handleBulkDelete() {
    const ids = new Set(selected.map((p) => p.id));
    setProducts((prev) => prev.filter((p) => !ids.has(p.id)));
    toast.success(`${selected.length} product${selected.length > 1 ? "s" : ""} deleted`);
    setSelected([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input placeholder="Search by name or SKU" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="In stock">In stock</SelectItem>
              <SelectItem value="Low stock">Low stock</SelectItem>
              <SelectItem value="Out of stock">Out of stock</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border-strong p-0.5">
            <button
              onClick={() => setView("table")}
              className={cn("rounded p-1.5", view === "table" ? "bg-surface-2 text-fg" : "text-fg-muted")}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn("rounded p-1.5", view === "grid" ? "bg-surface-2 text-fg" : "text-fg-muted")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {selected.length > 0 && (
            <Button variant="outline" size="sm" className="text-danger hover:bg-danger-soft" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete ({selected.length})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-xl border border-border bg-surface">
          <DataTable columns={columns} data={filteredData} onRowSelectionChange={setSelected} emptyMessage="No products match your filters." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredData.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              <div className="flex h-28 items-center justify-center border-b border-border bg-surface-2 text-fg-muted">
                <LayoutGrid className="h-6 w-6 opacity-40" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-fg">{product.name}</p>
                  <Badge variant={statusVariant[product.status]} dot className="shrink-0">
                    {product.status}
                  </Badge>
                </div>
                <p className="text-xs text-fg-muted">{product.sku} · {product.category}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-base font-semibold tabular-nums text-fg">{formatCurrency(product.price)}</span>
                  <span className="text-xs text-fg-muted">{formatNumber(product.stock)} in stock</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingProduct(product);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => setDeleteTarget(product)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} onSave={handleSave} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this product?"
        description={`This will permanently remove ${deleteTarget?.name ?? "this product"} from your catalog. This action can't be undone.`}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.length} products?`}
        description="This will permanently remove the selected products from your catalog. This action can't be undone."
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
