import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldStyles, singleLineFieldStyles } from "@/components/ui/field-styles";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          fieldStyles,
          singleLineFieldStyles,
          "flex px-3 py-1",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
