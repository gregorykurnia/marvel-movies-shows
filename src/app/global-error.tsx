"use client";

import { TriangleAlert } from "lucide-react";

import "./globals.css";
import { MessagePanel } from "@/components/layout/message-panel";
import { Button } from "@/components/ui/button";

// Last-resort boundary. It replaces the root layout, so it renders its own html and body.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col justify-center bg-paper px-4 text-ink">
        <MessagePanel
          icon={<TriangleAlert aria-hidden strokeWidth={2.25} className="size-9" />}
          title="Something broke"
          actions={
            <Button variant="primary" onClick={retry}>
              Try again
            </Button>
          }
        >
          The app hit an unexpected error. Try again, or reload the page.
        </MessagePanel>
      </body>
    </html>
  );
}
