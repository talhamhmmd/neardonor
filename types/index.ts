/**
 * App-facing types.
 *
 * The database schema types live in `lib/database.types.ts` (the source of
 * truth mirroring `supabase/migrations`). These types are derived / aliased
 * here so UI code reads naturally and the two never drift.
 */
import type {
  BloodGroup,
  DonorStatus,
  DonationStatus,
  NotificationStatus,
  RequestStatus,
  RequestUrgency,
  RequestResponse,
  UserNotificationType,
  PushStatus,
} from "../lib/database.types";

export type {
  BloodGroup,
  DonorStatus,
  DonationStatus,
  NotificationStatus,
  RequestStatus,
  RequestUrgency,
  RequestResponse,
  UserNotificationType,
  PushStatus,
};

/** Row types used by queries. */
export type Profile = import("../lib/database.types").Database["public"]["Tables"]["profiles"]["Row"];
export type EmergencyRequest = import("../lib/database.types").Database["public"]["Tables"]["emergency_requests"]["Row"];
export type Donation = import("../lib/database.types").Database["public"]["Tables"]["donations"]["Row"];
export type DonorNotification = import("../lib/database.types").Database["public"]["Tables"]["notifications"]["Row"];
export type DeviceToken = import("../lib/database.types").Database["public"]["Tables"]["device_tokens"]["Row"];
export type RequestResponseRow = import("../lib/database.types").Database["public"]["Tables"]["request_responses"]["Row"];
export type UserNotification = import("../lib/database.types").Database["public"]["Tables"]["user_notifications"]["Row"];

/** A nearby emergency request surfaced to a donor, with distance attached. */
export interface NearbyRequest extends EmergencyRequest {
  distance_km: number;
}

/** Result of the server-side `nearby_eligible_donors` matching function. */
export interface NearbyEligibleDonor {
  donor_id: string;
  full_name: string;
  blood_group: BloodGroup;
  city: string | null;
  distance_km: number;
  last_donation_at: string | null;
}

export interface ProfileInput {
  full_name: string;
  blood_group: BloodGroup;
  city: string;
  is_donor: boolean;
  donor_status?: DonorStatus;
  search_radius_km?: number;
  notifications_enabled?: boolean;
}

export interface RequestInput {
  patient_name: string;
  blood_group: BloodGroup;
  units: number;
  urgency: RequestUrgency;
  hospital_name: string;
  hospital_city?: string | null;
  latitude: number;
  longitude: number;
  contact_number?: string | null;
  notes?: string | null;
}

export interface DonationInput {
  blood_group: BloodGroup;
  hospital_name: string;
  status: DonationStatus;
  donated_at: string;
  notes?: string | null;
}

/** Donor-safe request detail (no contact number, no notes, no requester info). */
export type DonorRequestDetail = NonNullable<
  import("../lib/database.types").Database["public"]["Functions"]["request_detail_for_donor"]["Returns"]
>[number];

/** Owner-safe donor response (display name, blood group, distance, state). */
export type OwnerResponse = NonNullable<
  import("../lib/database.types").Database["public"]["Functions"]["request_responses_for_owner"]["Returns"]
>[number];
