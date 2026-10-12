import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. Pill, 2px ink outline, offset pop shadow.
// Hover lifts 1px, press sinks 2px. Only one primary (red) button per view.
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-pill border-2 border-line font-body text-[15px] font-bold leading-none no-underline",
    "cursor-pointer shadow-[3px_3px_0_var(--shadow-ink)]",
    "transition-[transform,box-shadow,background-color] duration-token ease-token",
    "hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--shadow-ink)]",
    "active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--shadow-ink)]",
    "disabled:pointer-events-none disabled:translate-0 disabled:opacity-[.45] disabled:shadow-[3px_3px_0_var(--shadow-ink)]",
  ],
  {
    variants: {
      variant: {
        secondary: "bg-surface text-ink",
        primary: "bg-red text-on-red",
        blue: "bg-blue text-on-blue",
        yellow: "bg-yellow text-on-yellow",
        ghost:
          "border-transparent bg-transparent text-ink shadow-none hover:translate-0 hover:bg-surface-2 hover:shadow-none active:translate-0 active:shadow-none",
        danger:
          "border-red bg-surface text-red-ink shadow-[3px_3px_0_var(--red)] hover:shadow-[4px_4px_0_var(--red)] active:shadow-[1px_1px_0_var(--red)]",
      },
      size: {
        default: "min-h-[42px] px-[18px]",
        sm: "min-h-[34px] px-3 text-[13px]",
        icon: "size-[42px] p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
