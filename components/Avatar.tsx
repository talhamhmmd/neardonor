import { View, Text } from "react-native";
import { colors } from "../constants/theme";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  /** Optional custom background color. Defaults to brand primary. */
  backgroundColor?: string;
}

const sizeStyles = {
  sm: "w-8 h-8 rounded-full",
  md: "w-12 h-12 rounded-full",
  lg: "w-20 h-20 rounded-full",
} as const;

const textStyles = {
  sm: "text-body-small",
  md: "text-h2",
  lg: "text-3xl",
} as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = "md", backgroundColor = colors.primary }: AvatarProps) {
  return (
    <View className={`${sizeStyles[size]} items-center justify-center`} style={{ backgroundColor }}>
      <Text className={`${textStyles[size]} text-white font-bold`} accessibilityLabel={`${name}'s avatar`}>
        {initials(name)}
      </Text>
    </View>
  );
}
