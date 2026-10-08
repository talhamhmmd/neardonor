import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { colors } from "../constants/theme";

export type LocationPermissionState = "unknown" | "granted" | "denied" | "unavailable";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface LocationPermissionCardProps {
  state: LocationPermissionState;
  onRequest?: () => void;
  onOpenSettings?: () => void;
  onRetry?: () => void;
}

interface Config {
  icon: IconName;
  title: string;
  message: string;
  actions: ReactElement[];
}

function renderActions(onRequest?: () => void, onOpenSettings?: () => void, onRetry?: () => void): ReactElement[] {
  if (onRequest) {
    return [
      <TouchableOpacity
        key="allow"
        onPress={onRequest}
        accessibilityRole="button"
        className="flex-1 bg-primary py-3.5 rounded-xl items-center"
      >
        <Text className="text-white font-semibold text-button">Allow Location</Text>
      </TouchableOpacity>,
    ];
  }
  if (onOpenSettings) {
    return [
      <TouchableOpacity
        key="settings"
        onPress={onOpenSettings}
        accessibilityRole="button"
        className="flex-1 bg-surface border-2 border-primary py-3.5 rounded-xl items-center"
      >
        <Text className="text-primary font-semibold text-button">Open Settings</Text>
      </TouchableOpacity>,
      ...(onRetry
        ? [
            <TouchableOpacity
              key="retry"
              onPress={onRetry}
              accessibilityRole="button"
              className="flex-1 bg-primary py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-semibold text-button">Try Again</Text>
            </TouchableOpacity>,
          ]
        : []),
    ];
  }
  if (onRetry) {
    return [
      <TouchableOpacity
        key="retry"
        onPress={onRetry}
        accessibilityRole="button"
        className="flex-1 bg-primary py-3.5 rounded-xl items-center"
      >
        <Text className="text-white font-semibold text-button">Retry</Text>
      </TouchableOpacity>,
    ];
  }
  return [];
}

function configFor(state: LocationPermissionState, onRequest?: () => void, onOpenSettings?: () => void, onRetry?: () => void): Config {
  switch (state) {
    case "granted":
      return {
        icon: "checkmark-circle-outline",
        title: "Location active",
        message: "Your location is being used to find nearby matches.",
        actions: [],
      };
    case "denied":
      return {
        icon: "location-outline",
        title: "Location access denied",
        message: "Enable location in Settings to see nearby donors and requests.",
        actions: renderActions(undefined, onOpenSettings, onRetry),
      };
    case "unavailable":
      return {
        icon: "alert-circle-outline",
        title: "Location unavailable",
        message: "We couldn't determine your location. Please check that GPS is enabled.",
        actions: renderActions(undefined, undefined, onRetry),
      };
    default:
      return {
        icon: "location-outline",
        title: "Location needed",
        message: "NearDonor uses your location to find nearby donors and requests.",
        actions: renderActions(onRequest),
      };
  }
}

export function LocationPermissionCard({ state, onRequest, onOpenSettings, onRetry }: LocationPermissionCardProps) {
  const config = configFor(state, onRequest, onOpenSettings, onRetry);
  const iconBg =
    state === "granted" ? "#E7F6EC" : state === "denied" ? "#FDECEC" : "#FEF3E2";
  const iconColor =
    state === "granted" ? colors.success : state === "denied" ? colors.danger : colors.warning;

  return (
    <View className="bg-surface rounded-lg p-4 border border-border">
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <Ionicons name={config.icon} size={24} color={iconColor} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-ink font-semibold text-body">{config.title}</Text>
          <Text className="text-ink-secondary text-caption mt-1 leading-5">{config.message}</Text>
        </View>
      </View>
      {config.actions.length > 0 ? (
        <View className="flex-row gap-3 mt-4">{config.actions}</View>
      ) : null}
    </View>
  );
}