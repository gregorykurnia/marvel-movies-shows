import { sql } from "drizzle-orm";
import { Clapperboard, Compass, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { accentClasses, type Accent } from "@/components/ui/eyebrow";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db";
import { entries } from "@/db/schema";

export const metadata: Metadata = { title: "Home" };

// Overall watched progress, read from the database. connection() opts this out of prerendering, so it
// always reads live data. The Suspense fallback is a skeleton, not a spinner.
async function WatchedProgress() {
  await connection();
  const [totals] = await getDb()
    .select({
      total: sql<number>`count(*)::int`,
      watched: sql<number>`(count(*) filter (where ${entries.watched}))::int`,
    })
    .from(entries);

  const total = totals?.total ?? 0;
  const watched = totals?.watched ?? 0;
  const percent = total === 0 ? 0 : (watched / total) * 100;

  return (
    <ProgressBar
      value={percent}
      label={`${watched} / ${total} · ${Math.round(percent)}%`}
      ariaLabel="Overall watched progress"
    />
  );
}

const sections: {
  href: string;
  title: string;
  description: string;
  accent: Accent;
  icon: typeof Clapperboard;
}[] = [
  {
    href: "/recaps",
    title: "Recaps",
    description: "Every movie and episode, in the order you chose.",
    accent: "red",
    icon: Clapperboard,
  },
  {
    href: "/timeline",
    title: "Timeline",
    description: "The key events of the universe, laid out by year.",
    accent: "orange",
    icon: Compass,
  },
  {
    href: "/characters",
    title: "Characters",
    description: "Every variant, searchable, filterable and sortable.",
    accent: "violet",
    icon: Users,
  },
];

export default function HomePage() {
  return (
    <>
      <PageHeader
        accent="red"
        eyebrow="Home"
        title="Marvel Directory"
      >
        <Suspense fallback={<Skeleton className="h-3.5 w-full" />}>
          <WatchedProgress />
        </Suspense>
      </PageHeader>

      <nav
        aria-label="Sections"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`no-underline ${accentClasses[section.accent]}`}
            >
              <Panel interactive className="h-full p-5">
                <span
                  aria-hidden
                  className="mb-4 grid size-12 -rotate-5 place-items-center rounded-[14px] border-2 border-line bg-(--accent) text-(--on-accent)"
                >
                  <Icon strokeWidth={2.25} className="size-6" />
                </span>
                <h2 className="mb-1.5 font-display text-2xl font-bold text-(--accent-ink)">
                  {section.title}
                </h2>
                <p className="text-sm text-ink-2">{section.description}</p>
              </Panel>
            </Link>
          );
        })}
      </nav>

      <section aria-labelledby="recently-edited" className="mt-10">
        <h2 id="recently-edited" className="mb-4 font-display text-[28px] font-bold tracking-[-0.02em]">
          Recently edited
        </h2>
        <EmptyState
          icon="★"
          title="Nothing edited yet"
          action={
            <Link href="/titles/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add title
            </Link>
          }
        >
          Movies, shows and recaps you add or change will show up here.
        </EmptyState>
      </section>
    </>
  );
}
