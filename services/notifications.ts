import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { config } from "../constants/config";

/**
 * Show notifications as banners/lists even while the app is foregrounded.
 * Without this handler, foreground notifications would be silently dropped.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string {
  if (config.expoProjectId) return config.expoProjectId;
  const fromConfig =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | null)
      ?.eas?.projectId;
  return fromConfig ?? "";
}

/**
 * Asks for notification permission and, if granted, mints an Expo push token
 * for this device. Returns `null` (no throw) whenever the device/permission/
 * project setup does not allow a token - callers treat it as "not registerable".
 */
export async function registerForPushNotificationsAsync(): Promise<{
  token: string;
  platform: "ios" | "android";
} | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  const projectId = resolveProjectId();
  if (!projectId) return null;

  const current = await Notifications.getPermissionsAsync();
  let permission = current.status;
  if (permission !== "granted") {
    permission = (await Notifications.requestPermissionsAsync()).status;
  }
  if (permission !== "granted") return null;

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    return {
      token: pushToken.data,
      platform: Platform.OS === "ios" ? "ios" : "android",
    };
  } catch {
    return null;
  }
}

/**
 * Persists this device's push token under the signed-in user. Upserts on the
 * unique `token` so re-registrations never duplicate rows, and bumps
 * `last_seen_at` so stale tokens can be pruned later.
 */
export async function saveDeviceToken(
  userId: string,
  token: string,
  platform: "ios" | "android",
): Promise<void> {
  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) throw error;
}

/**
 * Deactivates every active token belonging to the user (used on logout so
 * the server stops sending to a signed-out device).
 */
export async function deactivateUserDeviceTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from("device_tokens")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) throw error;
}
