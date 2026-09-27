"use client";

import { MasterDataEmptyLink } from "@/components/ui/master-data-empty-link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MasterDataSelectOption {
  id: string;
  label: string;
}

export function MasterDataSelect({
  options,
  value,
  onValueChange,
  placeholder,
  href,
  resourceLabel,
  invalid,
}: {
  options: readonly MasterDataSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  href: string;
  resourceLabel: string;
  invalid?: boolean;
}) {
  if (options.length === 0) {
    return <MasterDataEmptyLink href={href} resourceLabel={resourceLabel} />;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
