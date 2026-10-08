import { View, Text } from "react-native";
import type { BloodGroup } from "../types";

export type BloodBadgeSize = "sm" | "md" | "lg";

const sizeStyles: Record<BloodBadgeSize, string> = {
  sm: "w-9 h-9 rounded-lg",
  md: "w-12 h-12 rounded-xl",
  lg: "w-16 h-16 rounded-xl",
};

const textSizeStyles: Record<BloodBadgeSize, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-lg",
};

export interface BloodBadgeProps {
  group: BloodGroup;
  size?: BloodBadgeSize;
  /** Use the brand blue instead of the danger red. Default red for recognition. */
  variant?: "danger" | "primary";
}

/**
 * Blood type identifier. Red is the conventional color for blood types;
 * it does not imply an emergency state.
 */
export function BloodBadge({ group, size = "md", variant = "danger" }: BloodBadgeProps) {
  const bg = variant === "danger" ? "bg-danger" : "bg-primary";
  return (
    <View className={`${sizeStyles[size]} ${bg} items-center justify-center`}>
      <Text className={`${textSizeStyles[size]} text-white font-bold text-center`}>{group}</Text>
    </View>
  );
}
