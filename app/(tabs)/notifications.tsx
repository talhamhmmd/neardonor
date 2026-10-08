import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/theme";
import { useUserNotifications } from "../../hooks/useUserNotifications";
import { useNetworkStatus } from "../../hooks/useNetwork";
import { LoadingState, EmptyState, OfflineState } from "../../components";
import type { UserNotification, UserNotificationType } from "../../types";
import { formatTimeAgo } from "../../utils/helpers";

interface TypeStyle {
  icon: string;
  color: string;
  bg: string;
}

function typeStyle(type: UserNotificationType): TypeStyle {
  switch (type) {
    case "emergency_request":
      return { icon: "medkit", color: colors.primary, bg: "#EAF0FF" };
    case "donor_accepted":
      return { icon: "checkmark-circle", color: colors.success, bg: "#E7F6EC" };
    case "donor_declined":
      return { icon: "close-circle", color: colors.inkSecondary, bg: "#EFF3F8" };
    case "request_cancelled":
      return { icon: "close-circle-outline", color: colors.danger, bg: "#FDECEC" };
    case "request_expired":
      return { icon: "time-outline", color: colors.warning, bg: "#FEF3E2" };
    case "request_fulfilled":
      return { icon: "heart", color: colors.success, bg: "#E7F6EC" };
    case "system":
      return { icon: "information-circle", color: colors.primary, bg: "#EAF0FF" };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    loading,
    refreshing,
    error,
    unreadCount,
    hasMore,
    fetchNotifications,
    refresh,
    markRead,
  } = useUserNotifications();
  const network = useNetworkStatus();

  const [markingId, setMarkingId] = useState<string | null>(null);

  if (network !== "online") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <OfflineState fullScreen onRetry={refresh} />
      </SafeAreaView>
    );
  }

  async function openNotification(item: UserNotification) {
    if (item.is_read) {
      if (item.request_id) router.push(`/request/${item.request_id}`);
      return;
    }
    setMarkingId(item.id);
    try {
      await markRead(item.id);
    } catch {
      // Marking read is best-effort; still allow navigation.
    } finally {
      setMarkingId(null);
      if (item.request_id) router.push(`/request/${item.request_id}`);
    }
  }

  function renderItem({ item }: { item: UserNotification }) {
    const style = typeStyle(item.type);
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        onPress={() => openNotification(item)}
        disabled={markingId === item.id}
        className="bg-surface rounded-xl p-4 mb-3 border border-border flex-row items-center gap-3"
        accessibilityRole="button"
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: style.bg }}
        >
          <Ionicons name={style.icon as never} size={22} color={style.color} />
        </View>
        <View className="flex-1 min-w-0">
          <Text
            className={`text-body ${isUnread ? "text-ink font-bold" : "text-ink font-medium"}`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text className="text-ink-secondary text-body-small mt-0.5" numberOfLines={2}>
            {item.body}
          </Text>
          <Text className="text-ink-secondary text-caption mt-1">{formatTimeAgo(item.created_at)}</Text>
        </View>
        {isUnread ? (
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
        )}
      </TouchableOpacity>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header unreadCount={unreadCount} />
        <LoadingState message="Loading notifications..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header unreadCount={unreadCount} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-6 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loading) {
            void fetchNotifications(Math.floor(notifications.length / 50));
          }
        }}
        ListEmptyComponent={
          error ? (
            <EmptyState
              title="Couldn't load notifications"
              message={error}
              icon="cloud-offline-outline"
              actionLabel="Try Again"
              onAction={refresh}
            />
          ) : (
            <EmptyState
              title="No notifications yet"
              message="You'll see updates here when donors respond to your requests or a request needs your help."
              icon="notifications-outline"
            />
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function Header({ unreadCount }: { unreadCount: number }) {
  return (
    <View className="bg-surface px-6 pt-16 pb-4 border-b border-border flex-row items-center justify-between">
      <Text className="text-ink text-xl font-bold">Notifications</Text>
      {unreadCount > 0 ? (
        <View className="bg-primary rounded-full px-3 py-1">
          <Text className="text-white text-caption font-bold">{unreadCount} new</Text>
        </View>
      ) : null}
    </View>
  );
}
