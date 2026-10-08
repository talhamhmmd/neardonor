import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { Profile, ProfileInput } from "../types";
import { toUserFacingMessage } from "../lib/errors";

/**
 * Authentication flow.
 *
 * OTP is verified entirely by Supabase Auth (server-side). The client never
 * accepts or fabricates an OTP on its own - it only relays the provider's
 * result.
 */
export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(userId: string) {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (err) {
      setError(toUserFacingMessage(err));
      setLoading(false);
      return;
    }

    if (data) {
      setUser(data as Profile);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }

  const sendOTP = useCallback(async (phone: string) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    if (err) throw err;
  }, []);

  const verifyOTP = useCallback(async (phone: string, token: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (err) throw err;
    return data;
  }, []);

  const createProfile = useCallback(async (input: ProfileInput) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new Error("No authenticated user");

    const { data, error: err } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          full_name: input.full_name,
          blood_group: input.blood_group,
          city: input.city,
          is_donor: input.is_donor,
          donor_status: input.donor_status ?? (input.is_donor ? "available" : "offline"),
          search_radius_km: input.search_radius_km ?? 20,
          notifications_enabled: input.notifications_enabled ?? true,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (err) throw err;
    setUser(data as Profile);
    setIsAuthenticated(true);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return {
    user,
    loading,
    isAuthenticated,
    error,
    sendOTP,
    verifyOTP,
    createProfile,
    logout,
  };
}
