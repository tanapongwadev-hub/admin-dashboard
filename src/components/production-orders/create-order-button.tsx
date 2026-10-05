"use client";

import { Factory, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createProductionOrderAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Button } from "@/components/ui/button";

export function CreateOrderButton({
  planId,
  planCode,
}: {
  planId: string;
  planCode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createProductionOrderAction(planId);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(
        `สั่งผลิตแล้ว ${result.order.code} (${result.order.packetCount} packet)`,
      );
      router.push("/products/process-orders?tab=orders");
    });
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-label={`สั่งผลิตแผน ${planCode}`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Factory className="size-4" />
      )}
      สั่งผลิต
    </Button>
  );
}
