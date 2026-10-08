import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { toUserFacingMessage } from "../lib/errors";
import type { Profile, ProfileInput } from "../types";

/** Fetch and update the current user's own profile. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (err) {
      setError(toUserFacingMessage(err));
    } else {
      setProfile((data as Profile | null) ?? null);
    }
    setLoading(false);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<ProfileInput>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data, error: err } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (err) throw err;
      setProfile(data as Profile);
      return data;
    },
    [],
  );

  /** Store exact location server-side. Other users never see it. */
  const setMyLocation = useCallback(async (latitude: number, longitude: number) => {
    const { error: err } = await supabase.rpc("update_my_location", { latitude, longitude });
    if (err) throw err;
  }, []);

  return { profile, loading, error, fetchProfile, updateProfile, setMyLocation };
}
