import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { toUserFacingMessage } from "../lib/errors";
import type { Donation, DonationInput } from "../types";

/** Donation history, derived from real records. */
export function useDonations() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDonations = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setDonations([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false });

      if (err) {
        setError(toUserFacingMessage(err));
        return;
      }
      setDonations((data as Donation[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordDonation = useCallback(async (input: DonationInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data, error: err } = await supabase
      .from("donations")
      .insert({ ...input, donor_id: user.id })
      .select()
      .single();

    if (err) throw err;
    setDonations((prev) => [data as Donation, ...prev]);
    return data;
  }, []);

  return {
    donations,
    loading,
    error,
    fetchDonations,
    recordDonation,
  };
}
