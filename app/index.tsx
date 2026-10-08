import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { isSupabaseConfigured } from "../constants/config";
import { useAuth } from "../hooks/useAuth";

/**
 * Splash / session-restore screen.
 *
 * Routes based on real auth + profile state (not a timer):
 *   - not authenticated            -> /login
 *   - authenticated, no blood group -> /create-profile (onboarding incomplete)
 *   - authenticated, onboarded      -> /(tabs)/home
 */
export default function SplashScreen() {
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (!user?.blood_group) {
      router.replace("/create-profile");
    } else {
      router.replace("/(tabs)/home");
    }
  }, [loading, isAuthenticated, user, router]);

  const configured = isSupabaseConfigured();

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center gap-6">
        <View
          className="w-24 h-24 rounded-2xl items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Ionicons name="medkit" size={40} color={colors.white} />
        </View>
        <Text className="text-ink text-4xl font-bold tracking-wider">NearDonor</Text>
        <Text className="text-ink-secondary text-lg text-center px-8">
          Every drop counts. Instantly connect donors with those in need.
        </Text>
        {!configured ? (
          <View className="mt-4 flex-row items-center gap-2 bg-warning/10 border border-warning px-4 py-2 rounded-lg">
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
            <Text className="text-warning text-caption font-medium">
              Backend not configured — add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env
            </Text>
          </View>
        ) : (
          <ActivityIndicator color={colors.primary} size="large" />
        )}
      </View>
    </View>
  );
}
