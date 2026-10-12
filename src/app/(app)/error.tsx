"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { MessagePanel } from "@/components/layout/message-panel";
import { Button, buttonVariants } from "@/components/ui/button";

// Error boundary for pages inside AppShell. The raw error is not shown to the visitor.
export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <MessagePanel
      icon={<TriangleAlert aria-hidden strokeWidth={2.25} className="size-9" />}
      title="Something broke"
      actions={
        <>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
          <Link href="/recaps" className={buttonVariants({ variant: "primary" })}>
            Back to Recaps
          </Link>
        </>
      }
    >
      Something went wrong while loading this page. Try again, or head back to your recaps.
    </MessagePanel>
  );
}
