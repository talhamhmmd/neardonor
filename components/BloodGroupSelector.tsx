import { View, Text, TouchableOpacity } from "react-native";
import type { BloodGroup } from "../types";
import { BLOOD_GROUPS } from "../utils/bloodGroups";

interface BloodGroupSelectorProps {
  value: BloodGroup | null;
  onChange: (group: BloodGroup) => void;
  label?: string;
  required?: boolean;
  error?: string | null;
}

/** Tap-to-select blood group grid. */
export function BloodGroupSelector({
  value,
  onChange,
  label = "Blood Group",
  required = false,
  error,
}: BloodGroupSelectorProps) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-label text-ink mb-2">
          {label}
          {required ? <Text className="text-danger"> *</Text> : null}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {BLOOD_GROUPS.map((bg) => {
          const selected = value === bg;
          return (
            <TouchableOpacity
              key={bg}
              onPress={() => onChange(bg)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Blood group ${bg}`}
              className={`px-4 py-3 rounded-md border-2 ${
                selected ? "border-primary bg-[#EAF0FF]" : "border-border bg-surface"
              }`}
            >
              <Text className={`font-bold ${selected ? "text-primary" : "text-ink"}`}>{bg}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text className="text-danger text-caption mt-1.5">{error}</Text> : null}
    </View>
  );
}
