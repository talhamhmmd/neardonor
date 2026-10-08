import { useEffect, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { isSupabaseConfigured } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { toUserFacingMessage } from "../lib/errors";
import { PrimaryButton, SecondaryButton, Input, LoadingState } from "../components";

const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginScreen() {
  const router = useRouter();
  const { sendOTP, verifyOTP, loading: authLoading } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [localError, setLocalError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function validatePhone(): boolean {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setLocalError("Please enter a valid phone number");
      return false;
    }
    return true;
  }

  async function handleSendOTP() {
    if (!configured) {
      setLocalError("Backend not configured. Add Supabase credentials to .env");
      return;
    }
    if (!validatePhone()) return;
    setLocalError("");
    try {
      await sendOTP(`+880${phone}`);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setLocalError(toUserFacingMessage(e));
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setLocalError("");
    try {
      await sendOTP(`+880${phone}`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setLocalError("");
    } catch (e) {
      setLocalError(toUserFacingMessage(e));
    }
  }

  async function handleVerifyOTP() {
    if (!otp || otp.replace(/\D/g, "").length < 4) {
      setLocalError("Please enter the OTP");
      return;
    }
    setLocalError("");
    try {
      await verifyOTP(`+880${phone}`, otp);
      // Onboarding/editing screen decides the next destination; the auth
      // listener has already fetched the real profile at this point.
      router.replace("/create-profile");
    } catch (e) {
      setLocalError(toUserFacingMessage(e));
    }
  }

  if (authLoading && !localError) {
    return <LoadingState fullScreen message="Verifying..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="medkit" size={32} color={colors.white} />
          </View>
          <Text className="text-ink text-3xl font-bold">NearDonor</Text>
          <Text className="text-ink-secondary text-lg mt-2">
            {step === "phone"
              ? "Enter your phone number to get started"
              : "Enter the OTP sent to +880 " + phone}
          </Text>
        </View>

        {!configured ? (
          <View className="mb-6 flex-row items-center gap-2 bg-warning/10 border border-warning px-4 py-3 rounded-lg">
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text className="text-warning text-caption font-medium flex-1">
              Backend not configured. Add Supabase credentials to .env
            </Text>
          </View>
        ) : null}

        {step === "phone" ? (
          <View className="gap-4">
            <Input
              label="Phone Number"
              placeholder="1XXXXXXXXXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              error={localError || undefined}
              required
              autoCapitalize="none"
            />
            <PrimaryButton
              title="Send OTP"
              onPress={handleSendOTP}
              loading={authLoading}
              disabled={!configured}
            />
          </View>
        ) : (
          <View className="gap-4">
            <Input
              label="OTP Code"
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              error={localError || undefined}
              required
              autoCapitalize="none"
            />
            <PrimaryButton title="Verify OTP" onPress={handleVerifyOTP} loading={authLoading} />
            <SecondaryButton title="Back" onPress={() => setStep("phone")} />
            <Pressable onPress={handleResend} disabled={cooldown > 0} className="items-center py-1">
              <Text className="text-primary text-caption font-medium">
                {cooldown > 0
                  ? `Resend OTP in ${cooldown}s`
                  : "Didn't receive the code? Resend"}
              </Text>
            </Pressable>
          </View>
        )}

        {localError ? (
          <Text className="text-danger text-caption text-center mt-4">{localError}</Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
