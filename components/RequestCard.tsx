import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { BloodBadge } from "./BloodBadge";
import { UrgencyBadge } from "./StatusBadge";
import type { BloodGroup, RequestStatus, RequestUrgency } from "../types";
import { formatDistance, formatTimeAgo } from "../utils/helpers";

interface RequestCardProps {
  id?: string;
  patientName: string;
  bloodGroup: BloodGroup;
  hospitalName: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  distanceKm: number | null;
  createdAt: string;
  units: number;
  onPress?: () => void;
  footer?: ReactNode;
}

export function RequestCard({
  patientName,
  bloodGroup,
  hospitalName,
  urgency,
  status,
  distanceKm,
  createdAt,
  units,
  onPress,
  footer,
}: RequestCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className="bg-surface rounded-lg p-4 mb-3 border border-border"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1">
          <BloodBadge group={bloodGroup} size="md" />
          <View className="flex-1">
            <Text className="text-ink font-semibold text-body" numberOfLines={1}>
              {patientName}
            </Text>
            <Text className="text-ink-secondary text-body-small mt-0.5" numberOfLines={1}>
              {hospitalName}
            </Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              {distanceKm !== null ? (
                <Ionicons name="location-outline" size={12} color="#64748B" />
              ) : null}
              <Text className="text-ink-secondary text-caption">
                {distanceKm !== null ? formatDistance(distanceKm) : ""}
                {distanceKm !== null ? " · " : ""}
                {units} unit{units > 1 ? "s" : ""} needed
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end gap-1.5">
          <UrgencyBadge urgency={urgency} />
          <Text className="text-ink-secondary text-caption">{formatTimeAgo(createdAt)}</Text>
        </View>
      </View>

      {footer ? <View className="flex-row gap-3 mt-4">{footer}</View> : null}
    </TouchableOpacity>
  );
}
