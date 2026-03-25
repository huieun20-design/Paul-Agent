import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  cyan: "bg-cyan-100 text-cyan-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}

// Status color mapping
export const statusColors: Record<string, string> = {
  PENDING: "yellow",
  CONFIRMED: "blue",
  SHIPPED: "purple",
  DELIVERED: "green",
  PAID: "green",
  CANCELLED: "red",
  UNPAID: "red",
  OVERDUE: "red",
  PARTIAL: "orange",
  OPEN: "yellow",
  IN_PROGRESS: "blue",
  RESOLVED: "green",
  CLOSED: "default",
  HIGH: "red",
  MEDIUM: "yellow",
  LOW: "green",
  INCOMING: "green",
  OUTGOING: "red",
  VENDOR: "purple",
  CUSTOMER: "blue",
  BOTH: "cyan",
};
