import { View, Text } from "react-native";

export type BadgeTone = "primary" | "success" | "warning" | "danger" | "neutral";

const badgeStyles: Record<BadgeTone, string> = {
  primary: "bg-[#EAF0FF]",
  success: "bg-[#E7F6EC]",
  warning: "bg-[#FEF3E2]",
  danger: "bg-[#FDECEC]",
  neutral: "bg-[#EFF3F8]",
};

const textStyles: Record<BadgeTone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-ink-secondary",
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ label, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <View className={`self-start px-2.5 py-1 rounded-full ${badgeStyles[tone]} ${className}`}>
      <Text className={`text-caption font-semibold ${textStyles[tone]}`} accessibilityRole="text">
        {label}
      </Text>
    </View>
  );
}
