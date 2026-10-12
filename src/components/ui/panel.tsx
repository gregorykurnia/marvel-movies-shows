import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §6. The core surface: 2px ink outline, 14px radius, 4px offset shadow.
// `interactive` panels lift on hover. Plain panels stay still.
export function Panel({
  interactive = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-panel border-2 border-line bg-surface shadow-pop",
        interactive &&
          "transition-[transform,box-shadow] duration-token ease-token hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-lg",
        className,
      )}
      {...props}
    />
  );
}
