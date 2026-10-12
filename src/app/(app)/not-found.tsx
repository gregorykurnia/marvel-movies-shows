import { Compass } from "lucide-react";
import Link from "next/link";

import { MessagePanel } from "@/components/layout/message-panel";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <MessagePanel
      icon={<Compass aria-hidden strokeWidth={2.25} className="size-9" />}
      title="Lost in the multiverse"
      actions={
        <Link href="/recaps" className={buttonVariants({ variant: "primary" })}>
          ← Back to Recaps
        </Link>
      }
    >
      This page doesn’t exist, or it hasn’t been built yet.
    </MessagePanel>
  );
}
