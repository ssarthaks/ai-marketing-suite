/**
 * Uniform result type for all server actions.
 * Keeps client-side handling consistent: check `ok`, then read `data` or `error`.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = void>(
  error: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}
