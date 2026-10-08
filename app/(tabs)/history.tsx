import { useEffect } from "react";
import { View, Text, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/theme";
import { isSupabaseConfigured } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useDonations } from "../../hooks/useDonations";
import { useNetworkStatus } from "../../hooks/useNetwork";
import {
  EmptyState,
  LoadingState,
  OfflineState,
  StatCard,
} from "../../components";
import { formatDate } from "../../utils/helpers";

export default function HistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { donations, loading, fetchDonations } = useDonations();
  const network = useNetworkStatus();

  const configured = isSupabaseConfigured();
  const isOnline = network === "online";

  useEffect(() => {
    if (isAuthenticated && configured && isOnline) {
      fetchDonations();
    }
  }, [isAuthenticated, isOnline]);

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
        <Text className="text-ink text-2xl font-bold">Donation History</Text>
      </View>

      <View className="flex-1 px-6 pt-6">
        {loading ? (
          <LoadingState message="Loading history..." />
        ) : donations.length === 0 ? (
          <EmptyState
            title="No Donation History"
            message="Your donation history will appear here once you complete a donation."
            icon="time-outline"
          />
        ) : (
          donations.map((donation) => (
            <View key={donation.id} className="bg-surface rounded-xl p-4 mb-3 border border-border">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: colors.danger + "20" }}>
                    <Ionicons name="heart" size={20} color={colors.danger} />
                  </View>
                  <View>
                    <Text className="text-ink font-semibold text-body">{donation.hospital_name ?? "Hospital"}</Text>
                    <Text className="text-ink-secondary text-body-small mt-0.5">
                      {donation.blood_group} · {formatDate(donation.donated_at)}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-ink-secondary text-caption capitalize">{donation.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}