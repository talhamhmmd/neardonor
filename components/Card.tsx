import { View } from "react-native";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Padded by default. Pass `padded={false}` for flush card bodies. */
  padded?: boolean;
}

export function Card({ children, className = "", padded = true }: CardProps) {
  return (
    <View className={`bg-surface rounded-lg border border-border ${padded ? "p-4" : ""} ${className}`}>
      {children}
    </View>
  );
}
