import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { toUserFacingMessage } from "../lib/errors";
import type {
  EmergencyRequest,
  NearbyRequest,
  RequestInput,
  RequestResponse,
  DonorRequestDetail,
  OwnerResponse,
} from "../types";

/**
 * Emergency request operations.
 *
 * Creation and lifecycle transitions are server-controlled via security
 * definer RPCs. Nearby request discovery is served by `nearby_requests`,
 * which returns distances only - never coordinates or contact details.
 */
export function useRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [nearbyRequests, setNearbyRequests] = useState<NearbyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(async (input: RequestInput) => {
    const { data, error: err } = await supabase.rpc("create_emergency_request", {
      p_patient_name: input.patient_name,
      p_blood_group: input.blood_group,
      p_units: input.units,
      p_urgency: input.urgency,
      p_hospital_name: input.hospital_name,
      p_hospital_city: input.hospital_city ?? null,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_contact_number: input.contact_number ?? null,
      p_notes: input.notes ?? null,
    });

    if (err) throw err;
    return data as EmergencyRequest;
  }, []);

  const cancelRequest = useCallback(async (requestId: string) => {
    const { error: err } = await supabase.rpc("cancel_request", { p_request_id: requestId });
    if (err) throw err;
  }, []);

  const getNearbyRequests = useCallback(
    async (latitude: number, longitude: number, radiusKm: number = 20) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase.rpc("nearby_requests", {
          p_latitude: latitude,
          p_longitude: longitude,
          p_radius_km: radiusKm,
        });

        if (err) {
          setError(toUserFacingMessage(err));
          setNearbyRequests([]);
          return;
        }

        setNearbyRequests((data as NearbyRequest[]) ?? []);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getUserRequests = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRequests([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (err) {
        setError(toUserFacingMessage(err));
        return;
      }
      setRequests((data as EmergencyRequest[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch a single request by id (RLS governs visibility). */
  const getRequestById = useCallback(async (requestId: string) => {
    setError(null);
    const { data, error: err } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (err) {
      setError(toUserFacingMessage(err));
      return null;
    }
    return (data as EmergencyRequest | null) ?? null;
  }, []);

  /**
   * Respond to a request (accept / decline). Server-authoritative: all
   * eligibility, distance and lifecycle checks happen in the RPC.
   */
  const respondToRequest = useCallback(
    async (requestId: string, response: RequestResponse) => {
      const { error: err } = await supabase.rpc("respond_to_emergency_request", {
        p_request_id: requestId,
        p_response: response,
      });
      if (err) throw err;
    },
    [],
  );

  /** Donor-safe request detail: facts + the donor's own distance/response. */
  const getDonorRequestDetail = useCallback(async (requestId: string) => {
    const { data, error: err } = await supabase.rpc("request_detail_for_donor", {
      p_request_id: requestId,
    });
    if (err) {
      setError(toUserFacingMessage(err));
      return null;
    }
    return (data?.[0] as DonorRequestDetail | undefined) ?? null;
  }, []);

  /** Owner-safe response list (display name, blood group, distance, state). */
  const getRequestResponses = useCallback(async (requestId: string) => {
    const { data, error: err } = await supabase.rpc("request_responses_for_owner", {
      p_request_id: requestId,
    });
    if (err) {
      setError(toUserFacingMessage(err));
      return [];
    }
    return (data as OwnerResponse[]) ?? [];
  }, []);

  return {
    requests,
    nearbyRequests,
    loading,
    error,
    createRequest,
    cancelRequest,
    getNearbyRequests,
    getUserRequests,
    getRequestById,
    respondToRequest,
    getDonorRequestDetail,
    getRequestResponses,
  };
}
