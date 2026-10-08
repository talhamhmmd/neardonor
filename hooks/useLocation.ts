import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { toUserFacingMessage } from "../lib/errors";

export type LocationPermissionState = "unknown" | "granted" | "denied" | "unavailable";

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Device location with explicit, distinct states so the UI can differentiate
 * "permission denied" from "location unavailable".
 */
export function useLocation() {
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [permission, setPermission] = useState<LocationPermissionState>("unknown");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void checkPermission();
  }, []);

  async function checkPermission() {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      setPermission("granted");
      await getLocation();
    } else {
      setPermission("denied");
      setLocation(null);
    }
  }

  async function getLocation() {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setPermission("granted");
      setError(null);
    } catch (e) {
      setPermission("unavailable");
      setLocation(null);
      setError(toUserFacingMessage(e));
    }
  }

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setPermission(granted ? "granted" : "denied");
    if (granted) {
      await getLocation();
    }
    return granted;
  }, []);

  return {
    location,
    permission,
    error,
    requestPermission,
    refreshLocation: getLocation,
  };
}
