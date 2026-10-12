// drizzle wraps the driver's error, so the Postgres code can be on the error or on its `cause`.
function pgCode(error: unknown): string | undefined {
  const direct = (error as { code?: unknown })?.code;
  const nested = (error as { cause?: { code?: unknown } })?.cause?.code;
  return (typeof direct === "string" ? direct : undefined) ?? (typeof nested === "string" ? nested : undefined);
}

// Postgres error 23505: a unique constraint rejected the write.
export function isUniqueViolation(error: unknown): boolean {
  return pgCode(error) === "23505";
}

// Postgres error 23001: a row can't be deleted because others still point at it (ON DELETE RESTRICT).
export function isRestrictViolation(error: unknown): boolean {
  return pgCode(error) === "23001";
}

// Postgres error 23503: a foreign key rejected the write, because a linked row was deleted in the meantime.
export function isForeignKeyViolation(error: unknown): boolean {
  return pgCode(error) === "23503";
}

// The name of the constraint that failed, as Postgres reports it on the error (or on its cause).
function constraintName(error: unknown): string | undefined {
  const direct = (error as { constraint?: unknown })?.constraint;
  const nested = (error as { cause?: { constraint?: unknown } })?.cause?.constraint;
  return (typeof direct === "string" ? direct : undefined) ?? (typeof nested === "string" ? nested : undefined);
}

// The universe link on a recap was rejected, because that universe was deleted in the meantime. The name is the one
// drizzle-kit gives the foreign key in migration 0001.
export function isMissingUniverseViolation(error: unknown): boolean {
  return isForeignKeyViolation(error) && constraintName(error) === "entries_universe_id_universes_id_fk";
}
