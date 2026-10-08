import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import {
  registerForPushNotificationsAsync,
  saveDeviceToken,
} from "../services/notifications";
import { toUserFacingMessage } from "../lib/errors";

export type DeviceTokenStatus =
  | "idle"
  | "registering"
  | "registered"
  | "skipped"
  | "error";

/**
 * Registers the current device's push token exactly once per signed-in user.
 * Silently skips (never throws) when the platform, permission or project
 * setup does not allow a token - the rest of the app must not crash because
 * of push setup. A recorded error string is exposed for diagnostics.
 */
export function useDeviceToken() {
  const [status, setStatus] = useState<DeviceTokenStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const registeredUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active || !session?.user) return;
      if (registeredUserId.current === session.user.id) return;
      registeredUserId.current = session.user.id;

      setStatus("registering");
      setError(null);

      const push = await registerForPushNotificationsAsync();
      if (!active) return;
      if (!push) {
        setStatus("skipped");
        return;
      }

      try {
        await saveDeviceToken(session.user.id, push.token, push.platform);
        if (active) setStatus("registered");
      } catch (err) {
        if (active) {
          setStatus("error");
          setError(toUserFacingMessage(err));
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  return { status, error };
}
