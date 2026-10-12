"use client";

import { useSyncExternalStore } from "react";

// Nothing changes after the page loads, so there is nothing to subscribe to.
const subscribe = () => () => {};

// A timestamp in the viewer's own time zone. The server doesn't know where the viewer is, so the server render and the
// first browser render show UTC. Once the page is in the browser, the local time replaces it.
export function LocalTime({ iso }: { iso: string }) {
  const local = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    () => null,
  );

  const utc = `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  return <time dateTime={iso}>{local ?? utc}</time>;
}
