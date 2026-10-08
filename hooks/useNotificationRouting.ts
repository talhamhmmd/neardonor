import { useEffect, useRef } from "react";
import { useRouter, useRootNavigationState } from "expo-router";
import * as Notifications from "expo-notifications";

function extractRequestId(data: Record<string, unknown> | undefined | null): string | null {
  const id = data?.requestId ?? data?.request_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Routes push-notification taps to /request/[id] consistently across:
 *   - app open (foreground response listener)
 *   - app backgrounded (response listener)
 *   - app completely closed (last response on cold start)
 *
 * Renders nothing; mount it inside the root layout.
 */
export function NotificationRouter() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const ready = navState?.key != null;
  const handledRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let active = true;

    function route(data: Record<string, unknown> | undefined | null) {
      const requestId = extractRequestId(data);
      if (!requestId) return;
      if (handledRequestId.current === requestId) return;
      handledRequestId.current = requestId;
      router.replace(`/request/${requestId}`);
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      route(response.notification.request.content.data as Record<string, unknown>);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        route(response.notification.request.content.data as Record<string, unknown>);
      },
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, [ready, router]);

  return null;
}
