import { Pill } from "lucide-react";

import { cn } from "@/lib/utils";

export function ProductThumb({
  name,
  imageUrl,
  size = "sm",
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "lg" ? "size-16 rounded-xl" : size === "md" ? "size-12 rounded-lg" : "size-9 rounded-lg";
  const iconSize = size === "lg" ? "size-7" : size === "md" ? "size-5" : "size-4";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn("shrink-0 object-cover", dim, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center bg-primary-soft text-primary",
        dim,
        className,
      )}
      aria-hidden
    >
      <Pill className={iconSize} />
    </span>
  );
}
