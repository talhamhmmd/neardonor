import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { isSupabaseConfigured } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { useLocation } from "../hooks/useLocation";
import {
  PrimaryButton,
  BloodGroupSelector,
  Input,
  LoadingState,
  LocationPermissionCard,
} from "../components";
import type { BloodGroup } from "../types";
import { BLOOD_GROUPS } from "../utils/bloodGroups";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

/**
 * Onboarding (first time) and profile editing (reached from Profile tab).
 *
 * Persists only real schema fields. Exact coordinates are sent exclusively
 * through the `update_my_location` RPC - never stored locally by another
 * user and never written via the direct table API.
 */
export default function CreateProfileScreen() {
  const router = useRouter();
  const { user, createProfile, loading: authLoading } = useAuth();
  const { setMyLocation } = useProfile();
  const {
    location,
    permission,
    requestPermission,
    refreshLocation,
  } = useLocation();

  const isEditing = Boolean(user?.blood_group);
  const [name, setName] = useState(user?.full_name ?? "");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(
    user?.blood_group ?? null,
  );
  const [city, setCity] = useState(user?.city ?? "");
  const [isDonor, setIsDonor] = useState(
    user?.is_donor ?? (user?.donor_status === "available"),
  );
  const [radius, setRadius] = useState<number>(user?.search_radius_km ?? 20);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleAllowLocation() {
    const granted = await requestPermission();
    if (!granted) return;
    if (location) {
      await saveLocation();
    }
  }

  async function saveLocation() {
    if (!location) return;
    setLoading(true);
    setLocalError("");
    try {
      await setMyLocation(location.latitude, location.longitude);
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Could not save your location.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (!configured) {
      setLocalError("Backend not configured. Add Supabase credentials to .env");
      return;
    }
    if (!name || !bloodGroup || !city) {
      setLocalError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setLocalError("");
    try {
      await createProfile({
        full_name: name,
        blood_group: bloodGroup,
        city,
        is_donor: isDonor,
        donor_status: isDonor ? "available" : "offline",
        search_radius_km: radius,
        notifications_enabled: true,
      });
      // Persist exact location only if the user has granted access.
      if (location) {
        await setMyLocation(location.latitude, location.longitude);
      }
      router.replace("/(tabs)/home");
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Failed to save profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading && !localError) {
    return <LoadingState fullScreen message="Loading profile..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1 px-6 pt-16" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons
              name={isEditing ? "person-outline" : "person-add-outline"}
              size={32}
              color={colors.white}
            />
          </View>
          <Text className="text-ink text-3xl font-bold">
            {isEditing ? "Edit Profile" : "Create Profile"}
          </Text>
          <Text className="text-ink-secondary text-lg mt-2">Tell us about yourself</Text>
        </View>

        {!configured ? (
          <View className="mb-6 flex-row items-center gap-2 bg-warning/10 border border-warning px-4 py-3 rounded-lg">
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text className="text-warning text-caption font-medium flex-1">
              Backend not configured. Add Supabase credentials to .env
            </Text>
          </View>
        ) : null}

        <View className="gap-6">
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            required
            autoCapitalize="words"
          />

          <BloodGroupSelector
            label="Blood Group"
            value={bloodGroup}
            onChange={setBloodGroup}
            required
          />

          <Input
            label="City"
            placeholder="Enter your city"
            value={city}
            onChangeText={setCity}
            required
            autoCapitalize="words"
          />

          <View className="bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-ink font-semibold text-body">Available as donor</Text>
                <Text className="text-ink-secondary text-caption mt-0.5">
                  When on, you will be offered nearby requests within your radius.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDonor((v) => !v)}
                accessibilityRole="switch"
                accessibilityState={{ checked: isDonor }}
                className={`w-14 h-8 rounded-full justify-center px-1 ${
                  isDonor ? "bg-primary" : "bg-border"
                }`}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white shadow ${
                    isDonor ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="text-caption text-ink-secondary uppercase tracking-wide mb-3">
              Search radius
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => {
                const active = radius === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRadius(r)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`px-4 py-3 rounded-xl border-2 ${
                      active ? "border-primary bg-[#EAF0FF]" : "border-border bg-surface"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        active ? "text-primary" : "text-ink-secondary"
                      }`}
                    >
                      {r} km
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-caption text-ink-secondary uppercase tracking-wide">
              Location
            </Text>
            <LocationPermissionCard
              state={permission}
              onRequest={handleAllowLocation}
              onOpenSettings={() => Linking.openSettings()}
              onRetry={refreshLocation}
            />
          </View>
        </View>

        {localError ? (
          <Text className="text-danger text-caption text-center mt-4">{localError}</Text>
        ) : null}

        <View className="mt-8 mb-12">
          <PrimaryButton
            title={isEditing ? "Save Changes" : "Continue"}
            onPress={handleContinue}
            loading={loading}
            disabled={!configured}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}