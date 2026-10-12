import { notFound } from "next/navigation";

// Catch-all so unknown URLs render the designed 404 inside AppShell, not Next's default page.
// Blocking (instant = false): the route always 404s, and a blocking render sets the 404 status code reliably.
export const instant = false;

export default function UnknownPage() {
  notFound();
}
