import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/theme";
import { isSupabaseConfigured } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useLocation } from "../../hooks/useLocation";
import { useRequests } from "../../hooks/useRequests";
import { useNetworkStatus } from "../../hooks/useNetwork";
import {
  RequestCard,
  EmptyState,
  LoadingState,
  OfflineState,
  ErrorState,
} from "../../components";

export default function RequestsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { profile, fetchProfile } = useProfile();
  const { location, permission, requestPermission, refreshLocation } = useLocation();
  const { nearbyRequests, loading, error, getNearbyRequests } = useRequests();
  const network = useNetworkStatus();

  const configured = isSupabaseConfigured();
  const isOnline = network === "online";
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated || !configured || !isOnline) return;
    await fetchProfile();
    if (permission === "granted" && location) {
      await getNearbyRequests(
        location.latitude,
        location.longitude,
        profile?.search_radius_km ?? 20,
      );
    }
  }, [isAuthenticated, configured, isOnline, permission, location, profile, fetchProfile, getNearbyRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="bg-surface px-6 pt-16 pb-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-ink text-2xl font-bold">Nearby Requests</Text>
          <TouchableOpacity
            onPress={() => router.push("/emergency-request")}
            accessibilityRole="button"
            className="p-2"
          >
            <Ionicons name="add-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text className="text-ink-secondary text-body-small mt-1">Blood requests near you</Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <LoadingState message="Searching for requests..." />
        ) : error ? (
          <ErrorState
            title="Could not load requests"
            message={error}
            onRetry={onRefresh}
          />
        ) : nearbyRequests.length === 0 ? (
          <EmptyState
            title="No Requests Nearby"
            message="There are no blood requests in your area right now."
            icon="medkit-outline"
            actionLabel="Create Request"
            onAction={() => router.push("/emergency-request")}
          />
        ) : (
          nearbyRequests.map((req) => (
            <View key={req.id} className="mb-3">
              <RequestCard
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
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
