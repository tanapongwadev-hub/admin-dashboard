import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function UserAvatar({
  name,
  color = "chart-1",
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarFallback
        className="text-[color:var(--fg)]"
        style={{
          backgroundColor: `color-mix(in oklab, var(--${color}) 22%, transparent)`,
          color: `var(--${color})`,
        }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
