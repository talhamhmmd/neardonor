import { colors } from "../constants/theme";
import type { RequestStatus, RequestUrgency } from "../types";

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export interface Tone {
  label: string;
  color: string;
  /** Soft tinted background derived from the tone color. */
  bg: string;
}

/** Urgency tone: red only for critical; the rest use calm brand-consistent colors. */
export function getUrgencyTone(urgency: RequestUrgency): Tone {
  switch (urgency) {
    case "critical":
      return { label: "Critical", color: colors.danger, bg: "#FDECEC" };
    case "urgent":
      return { label: "Urgent", color: colors.warning, bg: "#FEF3E2" };
    case "normal":
      return { label: "Normal", color: colors.primary, bg: "#EAF0FF" };
  }
}

export function getStatusTone(status: RequestStatus): Tone {
  switch (status) {
    case "pending":
      return { label: "Pending", color: colors.primary, bg: "#EAF0FF" };
    case "matching":
      return { label: "Searching", color: colors.warning, bg: "#FEF3E2" };
    case "notified":
      return { label: "Notified", color: colors.primaryLight, bg: "#EAF0FF" };
    case "accepted":
      return { label: "Accepted", color: colors.success, bg: "#E7F6EC" };
    case "fulfilled":
      return { label: "Fulfilled", color: colors.success, bg: "#E7F6EC" };
    case "cancelled":
      return { label: "Cancelled", color: colors.inkSecondary, bg: "#EFF3F8" };
    case "expired":
      return { label: "Expired", color: colors.inkSecondary, bg: "#EFF3F8" };
  }
}
