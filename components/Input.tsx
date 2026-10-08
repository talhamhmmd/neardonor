import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { useState } from "react";

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "email-address";
  secure?: boolean;
  multiline?: boolean;
  maxLength?: number;
  error?: string | null;
  required?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secure = false,
  multiline = false,
  maxLength,
  error,
  required = false,
  autoCapitalize,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-label text-ink mb-2">
          {label}
          {required ? <Text className="text-danger"> *</Text> : null}
        </Text>
      ) : null}
      <View
        className={`flex-row items-center bg-surface rounded-md border ${
          focused ? "border-primary" : error ? "border-danger" : "border-border"
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSecondary}
          keyboardType={keyboardType}
          secureTextEntry={hidden}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? placeholder}
          accessibilityState={{ disabled: false }}
          className={`flex-1 text-ink text-body px-4 ${multiline ? "py-3 min-h-[88px] textAlignVertical-top" : "py-3.5"}`}
        />
        {secure ? (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show text" : "Hide text"}
            className="px-4 py-3"
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.inkSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text className="text-danger text-caption mt-1.5">{error}</Text> : null}
    </View>
  );
}
