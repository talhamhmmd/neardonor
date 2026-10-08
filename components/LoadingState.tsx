import { View, ActivityIndicator, Text } from "react-native";
import { colors } from "../constants/theme";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading...", fullScreen = false }: LoadingStateProps) {
  const content = (
    <View className="items-center justify-center gap-3 p-8">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="text-ink-secondary text-body-small">{message}</Text>
    </View>
  );

  if (fullScreen) {
    return <View className="flex-1 items-center justify-center bg-background">{content}</View>;
  }
  return content;
}
