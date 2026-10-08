import { View, Text } from "react-native";
import type { ReactNode } from "react";

interface StatCardProps {
  value: string;
  label: string;
  icon?: ReactNode;
  hint?: string;
}

/** Compact metric card for dashboard rows. */
export function StatCard({ value, label, icon, hint }: StatCardProps) {
  return (
    <View className="flex-1 items-center px-2">
      {icon ? <View className="mb-1" accessibilityElementsHidden>{icon}</View> : null}
      <Text className="text-ink text-2xl font-bold">{value}</Text>
      <Text className="text-ink-secondary text-caption text-center mt-0.5">{label}</Text>
      {hint ? <Text className="text-ink-secondary text-caption text-center mt-0.5">{hint}</Text> : null}
    </View>
  );
}