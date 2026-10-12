import type { ZodError } from "zod";

// What every Server Action returns. Errors come back as values, not thrown errors, so the form keeps what
// the user typed and can show each message next to its field.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T>;
export function ok(): ActionResult<undefined>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data: data as T };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

// The first message for each field. Form-level problems (no field) go under "form".
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = typeof issue.path[0] === "string" ? issue.path[0] : "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

export function validationFailure(error: ZodError): ActionResult<never> {
  return fail("Check the highlighted fields.", fieldErrorsFrom(error));
}
