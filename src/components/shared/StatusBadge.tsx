import { cn } from "@/lib/utils";

type BadgeVariant = "active" | "banned" | "admin" | "inactive" | "upcoming" | "ended";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-success text-success-foreground",
  banned: "bg-destructive text-destructive-foreground",
  admin: "bg-primary text-primary-foreground",
  inactive: "bg-muted text-muted-foreground border border-border",
  upcoming: "bg-primary text-primary-foreground",
  ended: "bg-muted text-muted-foreground border border-border",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-mono", variantStyles[variant], className)}>
      {children}
    </span>
  );
}
