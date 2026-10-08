import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Platform } from "react-native";
import type { ReactNode } from "react";
import { colors } from "../constants/theme";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  transparent?: boolean;
  animationType?: "none" | "slide" | "fade";
}

export function ModalWrapper({
  visible,
  onClose,
  children,
  transparent = true,
  animationType = "fade",
}: ModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <TouchableOpacity
          onPress={onClose}
          accessibilityLabel="Close modal"
          className="flex-1"
        >
          <View
            className="bg-surface rounded-xl max-w-[90%] w-full max-h-[85%] overflow-hidden"
            {...(Platform.OS === "web" ? { style: { maxHeight: "85%", maxWidth: "90%" } } : {})}
          >
            {children}
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}