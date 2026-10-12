"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. Inputs have a surface fill, a 2px ink outline and 8px radius, with a min height of 44px.
// Focus gives a blue outline, a 4px blue-soft ring and a 3px blue offset shadow.
// Errors give a red outline, a red-soft ring, and a message in red-ink below.
const controlBase = [
  "w-full min-h-11 rounded-input border-2 border-line bg-surface px-3.5 py-2.5",
  "font-body text-[15px] font-medium leading-[1.4] text-ink",
  "placeholder:text-ink-3 transition-[box-shadow,border-color] duration-token ease-token",
  "focus:border-blue focus:shadow-[0_0_0_4px_var(--blue-soft),3px_3px_0_var(--blue)] focus:outline-none",
  "aria-[invalid=true]:border-red aria-[invalid=true]:shadow-[0_0_0_4px_var(--red-soft)]",
  "disabled:opacity-50",
];

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

// Label, control, then the hint or error. Errors replace the hint.
export function FieldShell({ id, label, hint, error, children, className }: FieldShellProps) {
  const messageId = `${id}-message`;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={messageId} className="text-[13px] font-semibold text-red-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type CommonProps = {
  label: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
};

export function Input({
  label,
  hint,
  error,
  className,
  ...props
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const messageId = `${id}-message`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(controlBase)}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  mono = false,
  className,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const messageId = `${id}-message`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          controlBase,
          "min-h-[90px] resize-y leading-[1.6]",
          mono && "font-mono text-sm",
        )}
      />
    </FieldShell>
  );
}

// A native select, restyled. Native keeps the phone picker and keyboard behaviour.
export function Select({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const messageId = `${id}-message`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(controlBase, "appearance-none pr-10")}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={2.5}
          className="pointer-events-none absolute top-1/2 right-3.5 size-[18px] -translate-y-1/2 text-ink-2"
        />
      </div>
    </FieldShell>
  );
}
