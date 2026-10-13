// Other years on a recap (PRODUCT_PLAN §2.1, IMPLEMENTATION_PLAN §3.1): a flashback, a flash-forward or time travel.
// Each has a year, a kind and an optional note. The kinds are set by hand, never worked out from the main year.
export const TIME_JUMP_KINDS = ["flashback", "flash_forward", "time_travel"] as const;
export type TimeJumpKind = (typeof TIME_JUMP_KINDS)[number];

// The kind label, as shown on the recap page, the form and the timeline card and popover.
export const TIME_JUMP_LABEL: Record<TimeJumpKind, string> = {
  flashback: "Flashback",
  flash_forward: "Flash-forward",
  time_travel: "Time travel",
};

// One other year, as the recap page and the edit form read it.
export type TimeJump = {
  id: string;
  year: number;
  kind: TimeJumpKind;
  note: string | null;
};
