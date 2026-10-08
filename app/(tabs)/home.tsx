import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/theme";
import { isSupabaseConfigured } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useRequests } from "../../hooks/useRequests";
import { useDonations } from "../../hooks/useDonations";
import { useLocation } from "../../hooks/useLocation";
import { useNetworkStatus } from "../../hooks/useNetwork";
import {
  DangerButton,
  StatCard,
  RequestCard,
  LocationPermissionCard,
  EmptyState,
  LoadingState,
  OfflineState,
  Avatar,
  BloodBadge,
} from "../../components";
import type { BloodGroup } from "../../types";

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { profile, fetchProfile, updateProfile, setMyLocation } = useProfile();
  const { nearbyRequests, loading: requestsLoading, getNearbyRequests } = useRequests();
  const { donations, fetchDonations } = useDonations();
  const { location, permission, requestPermission, refreshLocation } = useLocation();
  const network = useNetworkStatus();

  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();
  const isOnline = network === "online";
  const isDonor = profile?.donor_status === "available";

  const load = useCallback(async () => {
    if (!isAuthenticated || !configured) return;
    setHomeError(null);
    await fetchProfile();
    await fetchDonations();
    if (permission === "granted" && location) {
      await getNearbyRequests(
        location.latitude,
        location.longitude,
        profile?.search_radius_km ?? 20,
      );
    }
  }, [isAuthenticated, configured, permission, location, profile, fetchProfile, fetchDonations, getNearbyRequests]);

  useEffect(() => {
    if (isOnline) {
      void load();
    }
  }, [load, isOnline]);

  // Update location for matching when it changes
  useEffect(() => {
    if (permission === "granted" && location && isAuthenticated) {
      setMyLocation(location.latitude, location.longitude);
    }
  }, [location, permission, isAuthenticated]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleAvailability() {
    if (!profile || toggling) return;
    setToggling(true);
    setHomeError(null);
    const next = profile.donor_status === "available" ? "offline" : "available";
    try {
      await updateProfile({
        donor_status: next,
        is_donor: next === "available",
      });
    } catch (e) {
      setHomeError(e instanceof Error ? e.message : "Could not update availability.");
    } finally {
      setToggling(false);
    }
  }

  const donationCount = donations.length;
  const livesHelped = donations.filter((d) => d.status === "completed").length;
  const nearbyCount = nearbyRequests.length;

  if (authLoading) return <LoadingState fullScreen />;
  if (!isAuthenticated) return <LoadingState fullScreen message="Loading..." />;

  const bloodGroupLabel: BloodGroup | null = profile?.blood_group ?? null;

  // Offline first
  if (!isOnline) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <OfflineState fullScreen onRetry={() => {}} />
      </SafeAreaView>
    );
  }

  // Not configured
  if (!configured) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-24 h-24 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: colors.warning }}>
            <Ionicons name="construct-outline" size={40} color={colors.white} />
          </View>
          <Text className="text-ink text-2xl font-bold text-center mb-2">Backend Not Configured</Text>
          <Text className="text-ink-secondary text-center leading-6">
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file, then restart the app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderLocationStatus = () => {
    switch (permission) {
      case "granted":
        return (
          <View className="flex-row items-center gap-2 bg-[#E7F6EC] px-3 py-2 rounded-lg">
            <Ionicons name="location-outline" size={16} color={colors.success} />
            <Text className="text-success font-medium text-caption">
              {location ? "Location active" : "Getting location..."}
            </Text>
          </View>
        );
      case "denied":
        return (
          <LocationPermissionCard
            state="denied"
            onOpenSettings={() => Linking.openSettings()}
            onRequest={requestPermission}
          />
        );
      case "unavailable":
        return <LocationPermissionCard state="unavailable" onRetry={refreshLocation} />;
      default:
        return <LocationPermissionCard state="unknown" onRequest={requestPermission} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-ink-secondary text-body-small">
                {profile ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}` : "Welcome"}
              </Text>
              <Text className="text-ink text-2xl font-bold mt-0.5">
                {profile?.full_name ?? "Donor"}
              </Text>
            </View>
            <Avatar name={profile?.full_name ?? "Donor"} size="lg" />
          </View>
        </View>

        {/* Availability + Blood Group + Location */}
        <View className="px-6 mb-4">
          <View className="bg-surface rounded-xl p-4 border border-border mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <View className={`w-10 h-10 rounded-full items-center justify-center ${
                  isDonor ? "bg-[#E7F6EC]" : "bg-[#FEF3E2]"
                }`}>
                  <Ionicons
                    name={isDonor ? "medkit" : "pause-circle-outline"}
                    size={20}
                    color={isDonor ? colors.success : colors.warning}
                  />
                </View>
                <View>
                  <Text className="text-ink font-semibold text-body">{isDonor ? "Available" : "Unavailable"}</Text>
                  <Text className="text-ink-secondary text-caption">
                    {isDonor ? "You will be notified of nearby requests" : "You won't receive notifications"}
                  </Text>
                </View>
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

            <View className="flex-row gap-3 mb-3">
              <TouchableOpacity
                onPress={() => router.push("/create-profile")}
                className="flex-1 bg-[#EAF0FF] rounded-lg p-3 items-center border border-primary"
              >
                {bloodGroupLabel ? (
                  <BloodBadge group={bloodGroupLabel} size="sm" variant="primary" />
                ) : (
                  <Text className="text-ink-secondary text-caption font-medium">Not set</Text>
                )}
                <Text className="text-primary font-semibold text-body-small mt-1">Blood Type</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/create-profile")}
                className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
              >
                <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                <Text className="text-ink font-semibold text-body-small mt-1">Search Radius</Text>
                <Text className="text-ink-secondary text-caption">{profile?.search_radius_km ?? 20} km</Text>
              </TouchableOpacity>
            </View>

            {renderLocationStatus()}
          </View>
        </View>

        {/* Stats Row */}
        <View className="px-6 mb-6">
          <View className="flex-row gap-2">
            <StatCard
              value={nearbyCount.toString()}
              label="Nearby Requests"
              icon={<Ionicons name="medkit-outline" size={24} color={colors.primary} />}
            />
            <StatCard
              value={donationCount.toString()}
              label="Donations"
              icon={<Ionicons name="heart-outline" size={24} color={colors.danger} />}
            />
            <StatCard
              value={livesHelped.toString()}
              label="Lives Helped"
              icon={<Ionicons name="people-outline" size={24} color={colors.success} />}
            />
          </View>
          {homeError ? (
            <Text className="text-danger text-caption text-center mt-2">{homeError}</Text>
          ) : null}
        </View>

        {/* Primary CTA - Emergency Request */}
        <View className="px-6 mb-6">
          <DangerButton
            title="REQUEST BLOOD NOW"
            onPress={() => router.push("/emergency-request")}
            leftIcon={<Ionicons name="flash-outline" size={22} color={colors.white} />}
            size="lg"
          />
        </View>

        {/* Nearby Requests */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink font-bold text-h3">Nearby Requests</Text>
            {nearbyCount > 0 ? (
              <Text className="text-ink-secondary text-caption">{nearbyCount} request{nearbyCount > 1 ? "s" : ""} found</Text>
            ) : null}
          </View>

          {requestsLoading ? (
            <View className="items-center py-8">
              <LoadingState message="Finding nearby requests..." />
            </View>
          ) : nearbyCount === 0 ? (
            <EmptyState
              title="No Nearby Requests"
              message="No compatible requests in your search area right now. You'll be notified when someone needs help."
              icon="file-tray-outline"
              actionLabel="Create Request"
              onAction={() => router.push("/emergency-request")}
            />
          ) : (
            <View>
              {nearbyRequests.slice(0, 5).map((req) => (
                <RequestCard
                  key={req.id}
                  patientName={req.patient_name}
                  bloodGroup={req.blood_group}
                  hospitalName={req.hospital_name}
                  urgency={req.urgency}
                  status={req.status}
                  distanceKm={req.distance_km}
                  createdAt={req.created_at}
                  units={req.units}
                  onPress={() => router.push(`/request/${req.id}`)}
                />
              ))}
              {nearbyCount > 5 && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/requests")}
                  className="items-center py-4"
                >
                  <Text className="text-primary font-semibold text-body">View all {nearbyCount} requests</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}