"use client";

import { useOptimistic, useTransition } from "react";

import { chipVariants } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { setWatched } from "@/actions/entries";
import { cn } from "@/lib/utils";

// The watched marker (PRODUCT_PLAN §2.4). Two states only. It shows the new state at once and rolls back,
// with a message, if the save fails. A green "✓ Watched" chip, or a dashed "Not watched" chip.
export function WatchedControl({
  entryId,
  watched,
  className,
}: {
  entryId: string;
  watched: boolean;
  className?: string;
}) {
  const [shown, setShown] = useOptimistic(watched);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    const next = !shown;
    startTransition(async () => {
      setShown(next);
      try {
        const result = await setWatched({ entryId, watched: next });
        if (!result.ok) toast(`Couldn't save: ${result.message}`);
      } catch {
        toast("Couldn't save the watched state. Check your connection and try again.");
      }
    });
  }

  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={toggle}
      className={cn(
        chipVariants({ tone: shown ? "watched" : "unwatched" }),
        "cursor-pointer transition-colors duration-token",
        className,
      )}
    >
      {shown ? "✓ Watched" : "Not watched"}
    </button>
  );
}
