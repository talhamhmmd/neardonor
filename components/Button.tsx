import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  accessibilityLabel?: string;
}

const variantContainer: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  secondary: "bg-surface border-2 border-border",
  danger: "bg-danger",
  ghost: "bg-transparent",
};

const variantText: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-primary",
  danger: "text-white",
  ghost: "text-primary",
};

const sizeContainer: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "py-2.5 px-4 rounded-lg min-h-[40px]",
  md: "py-3.5 px-6 rounded-xl min-h-[48px]",
  lg: "py-4 px-8 rounded-xl min-h-[52px]",
};

const sizeText: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "text-button text-sm",
  md: "text-button",
  lg: "text-button text-lg",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`flex-row items-center justify-center gap-2 ${variantContainer[variant]} ${sizeContainer[size]} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#305CDE" : "#FFFFFF"} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text className={`${variantText[variant]} ${sizeText[size]} font-semibold`}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}
