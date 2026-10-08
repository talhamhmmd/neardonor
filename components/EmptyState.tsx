import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "../constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, icon = "file-tray-outline", actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center justify-center p-8">
      <View className="w-16 h-16 rounded-full bg-[#EAF0FF] items-center justify-center mb-4">
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text className="text-ink font-bold text-h2 text-center mb-2">{title}</Text>
      {message ? (
        <Text className="text-ink-secondary text-body text-center leading-6">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          className="mt-6 bg-primary px-6 py-3.5 rounded-xl"
        >
          <Text className="text-white font-semibold text-button">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
