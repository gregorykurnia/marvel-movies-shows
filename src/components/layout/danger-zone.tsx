"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

// DESIGN_GUIDE §7. A red outline and red shadow, plain-language consequences, and a typed confirmation.
// The danger button stays disabled until the typed text matches exactly.
export function DangerZone({
  title,
  children,
  confirmWord,
  actionLabel,
  action,
}: {
  title: ReactNode;
  children: ReactNode;
  confirmWord: string;
  actionLabel: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const ready = typed === confirmWord;

  return (
    <section className="rounded-panel border-2 border-red bg-surface p-5 shadow-[4px_4px_0_var(--red)]">
      <h3 className="mb-1.5 font-display text-xl font-bold text-red-ink">{title}</h3>
      <div className="text-sm text-ink-2">{children}</div>
      <form action={action} className="mt-4 grid gap-3">
        <Input
          name="confirm"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          label={
            <>
              Type <span className="font-mono">{confirmWord}</span> to confirm
            </>
          }
        />
        <div>
          <Button type="submit" variant="danger" disabled={!ready}>
            {actionLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
