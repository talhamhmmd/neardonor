import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import type { BloodGroup } from "../types";
import { formatDistance } from "../utils/helpers";

interface DonorCardProps {
  name: string;
  bloodGroup: BloodGroup;
  distanceKm: number;
  lastDonatedLabel?: string | null;
  onPress?: () => void;
  footer?: ReactNode;
}

/** Donor summary. NEVER includes exact coordinates - only approximate distance. */
export function DonorCard({
  name,
  bloodGroup,
  distanceKm,
  lastDonatedLabel,
  onPress,
  footer,
}: DonorCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className="bg-surface rounded-lg p-4 mb-3 border border-border flex-row items-center gap-3"
    >
      <Avatar name={name} size="md" />
      <View className="flex-1">
        <Text className="text-ink font-semibold text-body">{name}</Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <View className="px-2 py-0.5 rounded bg-[#EAF0FF]">
            <Text className="text-primary text-caption font-bold">{bloodGroup}</Text>
          </View>
          <Text className="text-ink-secondary text-caption">· {formatDistance(distanceKm)} away</Text>
        </View>
        {lastDonatedLabel ? (
          <Text className="text-ink-secondary text-caption mt-1">Last donated: {lastDonatedLabel}</Text>
        ) : null}
      </View>
      {footer ?? <Ionicons name="chevron-forward" size={18} color="#64748B" />}
    </TouchableOpacity>
  );
}
