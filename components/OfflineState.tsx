import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

interface OfflineStateProps {
  onRetry?: () => void;
  fullScreen?: boolean;
}

/**
 * Shown when the device has no internet connection. Kept distinct from
 * backend errors and empty results so users aren't misled.
 */
export function OfflineState({ onRetry, fullScreen = false }: OfflineStateProps) {
  const content = (
    <View className="items-center justify-center p-8">
      <View className="w-16 h-16 rounded-full bg-[#FEF3E2] items-center justify-center mb-4">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.warning} />
      </View>
      <Text className="text-ink font-bold text-h2 text-center mb-2">You're offline</Text>
      <Text className="text-ink-secondary text-body text-center leading-6">
        Check your internet connection and try again.
      </Text>
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