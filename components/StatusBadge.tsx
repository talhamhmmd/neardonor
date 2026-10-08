import { View, Text } from "react-native";
import type { RequestStatus, RequestUrgency } from "../types";
import { getStatusTone, getUrgencyTone } from "../utils/helpers";
import { Badge, type BadgeTone } from "./Badge";

const toneMap: Record<string, BadgeTone> = {
  critical: "danger",
  urgent: "warning",
  normal: "primary",
  pending: "primary",
  matching: "warning",
  notified: "primary",
  accepted: "success",
  fulfilled: "success",
  cancelled: "neutral",
  expired: "neutral",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const tone = getStatusTone(status);
  return <Badge label={tone.label} tone={toneMap[status] ?? "neutral"} />;
}

export function UrgencyBadge({ urgency }: { urgency: RequestUrgency }) {
  const tone = getUrgencyTone(urgency);
  return <Badge label={tone.label} tone={toneMap[urgency] ?? "neutral"} />;
}

/** Raw tinted pill used for colored dots inside status panels. */
export function StatusDot({ color }: { color: string }) {
  return <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />;
}
