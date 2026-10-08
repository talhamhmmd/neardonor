/**
 * Map low-level errors (Supabase/Postgres/fetch) to human-readable messages.
 * Never surface raw provider errors or stack traces to end users.
 */

interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
}

export function toUserFacingMessage(err: unknown): string {
  const e = err as ErrorLike | null;

  if (!e) return "Something went wrong. Please try again.";
  if (!e.message) return "Something went wrong. Please try again.";

  const msg = e.message.toLowerCase();

  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "You appear to be offline. Check your internet connection and try again.";
  }
  if (msg.includes("invalid api key") || msg.includes("invalid jwt") || msg.includes("unauthorized")) {
    return "Your session has expired. Please sign in again.";
  }
  if (msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("violates row-level security")) {
    return "You don't have permission to do that.";
  }
  if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("invalid input syntax")) {
    return "The server is still being configured. Please try again shortly.";
  }
  if (msg.includes("duplicate")) {
    return "That already exists. Please check and try again.";
  }

  return e.message;
}

export function isOfflineError(err: unknown): boolean {
  const msg = ((err as ErrorLike | null)?.message ?? "").toLowerCase();
  return msg.includes("network") || msg.includes("failed to fetch") || msg.includes("fetch failed");
}