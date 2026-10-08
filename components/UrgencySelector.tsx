import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RequestUrgency } from "../types";
import { getUrgencyTone } from "../utils/helpers";

interface UrgencySelectorProps {
  value: RequestUrgency;
  onChange: (urgency: RequestUrgency) => void;
  label?: string;
}

const OPTIONS: { value: RequestUrgency; icon: "medkit" | "time-outline" | "snow-outline" }[] = [
  { value: "critical", icon: "medkit" },
  { value: "urgent", icon: "time-outline" },
  { value: "normal", icon: "snow-outline" },
];

export function UrgencySelector({ value, onChange, label = "Urgency" }: UrgencySelectorProps) {
  return (
    <View className="mb-4">
      <Text className="text-label text-ink mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {OPTIONS.map((opt) => {
          const tone = getUrgencyTone(opt.value);
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={tone.label}
              className={`flex-1 py-3.5 rounded-md items-center border-2 ${
                selected ? "border-primary bg-[#EAF0FF]" : "border-border bg-surface"
              }`}
            >
              <Ionicons name={opt.icon} size={20} color={selected ? "#305CDE" : "#64748B"} />
              <Text className={`mt-1 font-semibold capitalize ${selected ? "text-primary" : "text-ink"}`}>
                {tone.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
