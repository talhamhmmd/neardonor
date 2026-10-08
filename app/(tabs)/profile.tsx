import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/theme";
import { isSupabaseConfigured } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useNetworkStatus } from "../../hooks/useNetwork";
import { useDonations } from "../../hooks/useDonations";
import { deactivateUserDeviceTokens } from "../../services/notifications";
import { DangerButton, StatCard, Avatar } from "../../components";
import { LoadingState, OfflineState, ConfirmationModal } from "../../components";
import { formatDate } from "../../utils/helpers";

const MENU_ITEMS = [
  { id: "edit", title: "Edit Profile", icon: "create-outline" },
  { id: "help", title: "Help & Support", icon: "help-outline" },
  { id: "about", title: "About NearDonor", icon: "information-circle-outline" },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { profile, loading: profileLoading, fetchProfile, updateProfile } = useProfile();
  const { donations, fetchDonations } = useDonations();
  const network = useNetworkStatus();

  const configured = isSupabaseConfigured();
  const isOnline = network === "online";

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && configured && isOnline) {
      fetchProfile();
      fetchDonations();
    }
  }, [isAuthenticated, isOnline]);

  async function handleLogout() {
    if (user?.id) {
      try {
        await deactivateUserDeviceTokens(user.id);
      } catch {
        // best-effort; do not block sign-out
      }
    }
    await logout();
    router.replace("/login");
  }

  async function toggleAvailability() {
    if (!profile || toggling) return;
    setToggling(true);
    setProfileError(null);
    const next = profile.donor_status === "available" ? "offline" : "available";
    try {
      await updateProfile({
        donor_status: next,
        is_donor: next === "available",
      });
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Could not update availability.");
    } finally {
      setToggling(false);
    }
  }

  if (!isOnline) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <OfflineState fullScreen />
      </SafeAreaView>
    );
  }

  if (!configured) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-ink text-xl font-bold text-center">Backend Not Configured</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return <LoadingState fullScreen />;

  const isDonor = profile?.donor_status === "available";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="bg-surface items-center pt-16 pb-8 px-6 border-b border-border">
          <Avatar name={profile?.full_name ?? "Donor"} size="lg" />
          <Text className="text-ink text-2xl font-bold mt-4">{profile?.full_name ?? "Donor"}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            {profile?.blood_group ? (
              <View className="bg-[#EAF0FF] px-3 py-1 rounded-full">
                <Text className="text-primary text-xs font-bold">{profile.blood_group}</Text>
              </View>
            ) : null}
            <View
              className={`px-3 py-1 rounded-full ${
                isDonor ? "bg-[#E7F6EC]" : "bg-[#FEF3E2]"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isDonor ? "text-success" : "text-warning"
                }`}
              >
                {isDonor ? "Available to Donate" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        {/* Availability Toggle */}
        <View className="px-6 mt-6 mb-4">
          <View className="bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-ink font-semibold text-body">Donor Availability</Text>
                <Text className="text-ink-secondary text-caption mt-0.5">
                  {isDonor
                    ? "You will receive notifications for nearby requests."
                    : "You won't receive any request notifications."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleAvailability}
                accessibilityRole="switch"
                accessibilityState={{ checked: isDonor }}
                disabled={toggling}
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
            {profileError ? (
              <Text className="text-danger text-caption mt-2">{profileError}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View className="px-6 mb-4">
          <View className="flex-row gap-2">
            <StatCard value={donations.length.toString()} label="Donations" />
            <StatCard
              value={profile?.search_radius_km?.toString() ?? "20"}
              label="Radius (km)"
            />
            <StatCard
              value={profile?.last_donation_at ? formatDate(profile.last_donation_at) : "—"}
              label="Last Donation"
            />
          </View>
        </View>

        {/* Menu */}
        <View className="px-6">
          <View className="bg-surface rounded-xl overflow-hidden border border-border">
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  switch (item.id) {
                    case "edit":
                      router.push("/create-profile");
                      break;
                    default:
                      break;
                  }
                }}
                className={`flex-row items-center px-4 py-4 ${
                  index < MENU_ITEMS.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <Ionicons
                  name={item.icon as never}
                  size={22}
                  color={colors.inkSecondary}
                  className="mr-3"
                />
                <Text className="text-ink flex-1 font-medium">{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View className="px-6 mt-8 mb-12">
          <DangerButton
            title="Sign Out"
            onPress={() => setShowLogoutConfirm(true)}
            leftIcon={<Ionicons name="log-out-outline" size={20} color={colors.white} />}
            size="md"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
