import { View, Text, TouchableOpacity, Animated, Easing, PanResponder, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { colors } from "../constants/theme";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Height fraction of the screen (0-1). */
  snapHeight?: number;
}

/**
 * Simple slide-up sheet. Drag down to dismiss.
 */
export function BottomSheet({ visible, onClose, title, children, snapHeight = 0.7 }: BottomSheetProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 || g.dy < -8,
      onPanResponderMove: (_, g) => {
        dragY.current = g.dy;
        progress.setValue(dragY.current / (2000 * snapHeight));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          Animated.timing(progress, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(progress, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(progress, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [visible]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateY }],
            height: `${snapHeight * 100}%`,
          }}
          className="bg-surface rounded-t-xl overflow-hidden"
        >
          <View className="w-10 h-1.5 bg-border rounded-full self-center mt-3" />
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            {title ? <Text className="text-ink font-semibold text-body">{title}</Text> : <View />}
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" className="p-2">
              <Ionicons name="close-outline" size={24} color={colors.inkSecondary} />
            </TouchableOpacity>
          </View>
          <View className="flex-1" style={{ paddingBottom: Platform.OS === "android" ? 0 : 24 }}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}