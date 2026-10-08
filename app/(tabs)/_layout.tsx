import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { colors } from "../../constants/theme";
import { supabase } from "../../services/supabase";
import { useDeviceToken } from "../../hooks/useDeviceToken";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, { focused: string; unfocused: string }> = {
    home: { focused: "home", unfocused: "home-outline" },
    requests: { focused: "medkit", unfocused: "medkit-outline" },
    notifications: { focused: "notifications", unfocused: "notifications-outline" },
    history: { focused: "time", unfocused: "time-outline" },
    profile: { focused: "person", unfocused: "person-outline" },
  };

  const icon = icons[name] || { focused: "help", unfocused: "help-outline" };
  const iconName = focused ? icon.focused : icon.unfocused;

  return (
    <Ionicons
      name={iconName as never}
      size={26}
      color={focused ? colors.primary : colors.inkSecondary}
    />
  );
}

/** Live unread inbox count, kept fresh via realtime inserts/updates. */
function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function sync() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { count: unread } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (mounted) setCount(unread ?? 0);
    }

    void (async () => {
      await sync();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`unread-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
          () => void sync(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
          () => void sync(),
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

function NotificationsTabIcon({ focused }: { focused: boolean }) {
  const unread = useUnreadCount();
  return (
    <View>
      <TabIcon name="notifications" focused={focused} />
      {unread > 0 ? (
        <View
          className="absolute -top-1 -right-2 bg-danger rounded-full min-w-[18px] h-[18px] items-center justify-center px-1"
          style={{ borderWidth: 1.5, borderColor: colors.surface }}
        >
          <Text className="text-white text-[10px] font-bold">{unread > 99 ? "99+" : unread}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  // Register push token once per session (only runs when authenticated tabs mount).
  useDeviceToken();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 24,
          height: 72,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ focused }) => <TabIcon name="requests" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => <NotificationsTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}