import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { LocalTime } from "@/components/backup/local-time";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { loadLastBackup } from "@/lib/backup/export";

export const metadata: Metadata = { title: "Backup" };

// The Backup page (DESIGN_GUIDE §8, Settings): the header, then one panel per task. Download is the only task for now.
// Restoring from a file comes later, and it will go in a danger zone at the bottom.
export default function BackupPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <BackupContent />
    </Suspense>
  );
}

async function BackupContent() {
  await connection();
  const lastBackup = await loadLastBackup();

  return (
    <>
      <PageHeader
        accent="green"
        eyebrow="Backup"
        title="Backup"
        subtitle="Download everything as one file, and keep it somewhere safe."
      />
      <Panel className="grid gap-4 p-5 min-[640px]:p-7">
        <h2 className="font-display text-2xl leading-[1.15] font-bold tracking-[-0.02em]">Download a backup</h2>
        <p className="m-0 text-ink-2">
          One JSON file with every title, episode, recap, timeline event, character, universe, appearance, note and tag.
          You can open it in any text editor.
        </p>
        <p className="m-0 font-mono text-sm text-ink-2">
          {lastBackup ? (
            <>
              Last backup <LocalTime iso={lastBackup.toISOString()} />
            </>
          ) : (
            "No backup yet."
          )}
        </p>
        <div>
          {/* A route handler that sends a file, not a page, so the browser downloads it instead of navigating. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/backup/export" className={buttonVariants({ variant: "yellow" })}>
            ⬇ Download backup
          </a>
        </div>
        <p className="m-0 text-sm text-ink-3">
          Restoring from a file isn&apos;t available yet. Until it is, keep the downloaded files, and Neon&apos;s own
          point-in-time restore is the other safety net.
        </p>
      </Panel>
    </>
  );
}
