import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export type NetworkStatus = "online" | "offline" | "unknown";

/** Tracks device connectivity so the UI can distinguish offline from errors. */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setStatus(state.isConnected === null ? "unknown" : state.isConnected ? "online" : "offline");
    });
    return () => unsub();
  }, []);

  return status;
}

export function useIsOnline(): boolean {
  const status = useNetworkStatus();
  return status === "online";
}
