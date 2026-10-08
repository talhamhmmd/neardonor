import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { formatDistance } from "../utils/helpers";

interface LocationCardProps {
  city: string | null;
  distanceKm: number | null;
  /** Approximate radius the user searches within. */
  radiusKm: number;
  onSelect?: () => void;
  onConfigure?: () => void;
}

export function LocationCard({ city, distanceKm, radiusKm, onSelect, onConfigure }: LocationCardProps) {
  return (
    <View className="bg-surface rounded-lg p-4 border border-border">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-[#EAF0FF] items-center justify-center">
          <Ionicons name="navigate-outline" size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-ink font-semibold text-body">
            {city ?? "Location not set"}
          </Text>
          {distanceKm !== null ? (
            <Text className="text-ink-secondary text-caption mt-0.5">
              Searching within {formatDistance(radiusKm)} · {distanceKm === 0 ? "You are here" : `~${formatDistance(distanceKm)} to your area`}
            </Text>
          ) : (
            <Text className="text-ink-secondary text-caption mt-0.5">
              Searching within {formatDistance(radiusKm)}
            </Text>
          )}
        </View>
        {onConfigure ? (
          <TouchableOpacity
            onPress={onConfigure}
            accessibilityRole="button"
            accessibilityLabel="Change location settings"
            className="p-2"
          >
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : onSelect ? (
          <TouchableOpacity
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityLabel="Choose location"
            className="p-2"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
