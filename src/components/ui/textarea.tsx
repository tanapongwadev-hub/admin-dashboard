import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldStyles } from "@/components/ui/field-styles";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          fieldStyles,
          "flex min-h-20 px-3 py-2",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
