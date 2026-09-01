"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Product } from "@/lib/types";

const categories = ["Apparel", "Electronics", "Home & Living", "Beauty", "Sporting Goods", "Stationery"];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(3, "SKU must be at least 3 characters"),
  category: z.string(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  stock: z.coerce.number().int().min(0, "Stock can't be negative"),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (values: FormValues, existing?: Product | null) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", sku: "", category: categories[0], price: 0, stock: 0 },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        product
          ? { name: product.name, sku: product.sku, category: product.category, price: product.price, stock: product.stock }
          : { name: "", sku: "", category: categories[0], price: 0, stock: 0 }
      );
    }
  }, [open, product, reset]);

  function onSubmit(values: FormInput) {
    const parsed = schema.parse(values);
    onSave(parsed, product);
    toast.success(product ? "Product updated" : "Product created", {
      description: `${parsed.name} was saved successfully.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              {product ? "Update the product details and inventory." : "Add a new product to your catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" placeholder="Heritage Backpack" {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="SKU-10234" {...register("sku")} />
                {errors.sku && <p className="text-xs text-danger">{errors.sku.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Price (USD)</Label>
                <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
                {errors.price && <p className="text-xs text-danger">{errors.price.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stock">Stock quantity</Label>
                <Input id="stock" type="number" min="0" {...register("stock")} />
                {errors.stock && <p className="text-xs text-danger">{errors.stock.message}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
