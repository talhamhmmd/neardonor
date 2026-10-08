import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

export interface SelectOption<T extends string> {
  label: string;
  value: T;
  hint?: string;
}

export interface SelectProps<T extends string> {
  label?: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  required?: boolean;
  error?: string | null;
}

/** Inline single-choice selector rendered as segmented chips. */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  required = false,
  error,
}: SelectProps<T>) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-label text-ink mb-2">
          {label}
          {required ? <Text className="text-danger"> *</Text> : null}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label}
              className={`px-4 py-2.5 rounded-md border-2 flex-row items-center gap-1.5 ${
                selected ? "border-primary bg-[#EAF0FF]" : "border-border bg-surface"
              }`}
            >
              {opt.hint ? (
                <Ionicons name={opt.hint as never} size={14} color={selected ? colors.primary : colors.inkSecondary} />
              ) : null}
              <Text className={`text-body font-semibold ${selected ? "text-primary" : "text-ink"}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text className="text-danger text-caption mt-1.5">{error}</Text> : null}
    </View>
  );
}
