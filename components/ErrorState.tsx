import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  fullScreen = false,
}: ErrorStateProps) {
  const content = (
    <View className="items-center justify-center p-8">
      <View className="w-16 h-16 rounded-full bg-[#FDECEC] items-center justify-center mb-4">
        <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
      </View>
      <Text className="text-ink font-bold text-h2 text-center mb-2">{title}</Text>
      <Text className="text-ink-secondary text-body text-center leading-6">{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          className="mt-6 bg-primary px-6 py-3.5 rounded-xl"
        >
          <Text className="text-white font-semibold text-button">Try Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return <View className="flex-1 items-center justify-center bg-background">{content}</View>;
  }
  return content;
}