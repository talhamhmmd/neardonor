import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { ModalWrapper } from "./Modal";
import { colors } from "../constants/theme";

export type ConfirmVariant = "danger" | "success" | "primary";

const confirmBg: Record<ConfirmVariant, string> = {
  danger: "bg-danger",
  success: "bg-success",
  primary: "bg-primary",
};

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationModalProps) {
  return (
    <ModalWrapper visible={visible} onClose={onCancel}>
      <View className="p-6">
        <Text className="text-ink font-bold text-h2 text-center mb-2">{title}</Text>
        <Text className="text-ink-secondary text-body text-center mb-6 leading-6">{message}</Text>
        <View className="gap-3">
          <TouchableOpacity
            onPress={onConfirm}
            disabled={loading}
            accessibilityRole="button"
            className={`${confirmBg[variant]} py-3.5 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold text-button">{confirmText}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCancel}
            accessibilityRole="button"
            className="py-3.5 rounded-xl items-center border border-border bg-surface"
          >
            <Text className="text-ink font-semibold text-button">{cancelText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
}