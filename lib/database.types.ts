/**
 * Hand-authored Supabase database types mirroring `supabase/migrations`.
 *
 * NOTE: Regenerate with `supabase gen types typescript` against your project
 * as the source of truth. This file is kept in 1:1 alignment with the
 * migrations so the client is strongly typed until generated types land.
 */

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type DonorStatus = "available" | "unavailable" | "offline";
export type RequestUrgency = "critical" | "urgent" | "normal";
export type RequestStatus =
  | "pending"
  | "matching"
  | "notified"
  | "accepted"
  | "fulfilled"
  | "cancelled"
  | "expired";
export type NotificationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "maybe_later"
  | "expired";
export type DonationStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type ReportStatus = "open" | "under_review" | "resolved" | "dismissed";
export type ReportType = "request" | "user";
export type RequestResponse = "accepted" | "declined";
export type UserNotificationType =
  | "emergency_request"
  | "donor_accepted"
  | "donor_declined"
  | "request_cancelled"
  | "request_expired"
  | "request_fulfilled"
  | "system";
export type PushStatus = "pending" | "processing" | "sent" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          blood_group: BloodGroup | null;
          city: string | null;
          is_donor: boolean;
          is_verified: boolean;
          donor_status: DonorStatus;
          search_radius_km: number;
          notifications_enabled: boolean;
          last_donation_at: string | null;
          eligibility_status: string;
          location: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          blood_group?: BloodGroup | null;
          city?: string | null;
          is_donor?: boolean;
          is_verified?: boolean;
          donor_status?: DonorStatus;
          search_radius_km?: number;
          notifications_enabled?: boolean;
          last_donation_at?: string | null;
          eligibility_status?: string;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      emergency_requests: {
        Row: {
          id: string;
          requester_id: string;
          patient_name: string;
          blood_group: BloodGroup;
          units: number;
          urgency: RequestUrgency;
          hospital_name: string;
          hospital_city: string | null;
          hospital_location: unknown | null;
          contact_number: string | null;
          notes: string | null;
          status: RequestStatus;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          patient_name: string;
          blood_group: BloodGroup;
          units?: number;
          urgency?: RequestUrgency;
          hospital_name: string;
          hospital_city?: string | null;
          hospital_location?: unknown | null;
          contact_number?: string | null;
          notes?: string | null;
          status?: RequestStatus;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["emergency_requests"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          request_id: string;
          donor_id: string;
          status: NotificationStatus;
          distance_km: number | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          donor_id: string;
          status?: NotificationStatus;
          distance_km?: number | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          donor_id: string;
          request_id: string | null;
          blood_group: BloodGroup | null;
          hospital_name: string | null;
          status: DonationStatus;
          donated_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          donor_id: string;
          request_id?: string | null;
          blood_group?: BloodGroup | null;
          hospital_name?: string | null;
          status?: DonationStatus;
          donated_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["donations"]["Insert"]>;
        Relationships: [];
      };
      device_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          device_name: string | null;
          app_version: string | null;
          is_active: boolean;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          device_name?: string | null;
          app_version?: string | null;
          is_active?: boolean;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["device_tokens"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          report_type: ReportType;
          target_request_id: string | null;
          target_user_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          report_type: ReportType;
          target_request_id?: string | null;
          target_user_id?: string | null;
          reason: string;
          details?: string | null;
          status?: ReportStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocks"]["Insert"]>;
        Relationships: [];
      };
      request_responses: {
        Row: {
          id: string;
          request_id: string;
          donor_id: string;
          response: RequestResponse;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          donor_id: string;
          response: RequestResponse;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["request_responses"]["Insert"]>;
        Relationships: [];
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          request_id: string | null;
          type: UserNotificationType;
          title: string;
          body: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          request_id?: string | null;
          type: UserNotificationType;
          title: string;
          body: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_notifications"]["Insert"]>;
        Relationships: [];
      };
      push_queue: {
        Row: {
          id: string;
          notification_id: string | null;
          user_notification_id: string | null;
          status: PushStatus;
          attempts: number;
          last_error: string | null;
          claimed_at: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id?: string | null;
          user_notification_id?: string | null;
          status?: PushStatus;
          attempts?: number;
          last_error?: string | null;
          claimed_at?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_queue"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_my_location: {
        Args: { latitude: number; longitude: number };
        Returns: void;
      };
      is_compatible_donor: {
        Args: { donor_group: BloodGroup; patient_group: BloodGroup };
        Returns: boolean;
      };
      nearby_eligible_donors: {
        Args: {
          p_blood_group: BloodGroup;
          p_latitude: number;
          p_longitude: number;
          p_radius_km: number;
        };
        Returns: {
          donor_id: string;
          full_name: string;
          blood_group: BloodGroup;
          city: string | null;
          distance_km: number;
          last_donation_at: string | null;
        }[];
      };
      create_emergency_request: {
        Args: {
          p_patient_name: string;
          p_blood_group: BloodGroup;
          p_units: number;
          p_urgency: RequestUrgency;
          p_hospital_name: string;
          p_hospital_city: string | null;
          p_latitude: number;
          p_longitude: number;
          p_contact_number: string | null;
          p_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["emergency_requests"]["Row"];
      };
      cancel_request: {
        Args: { p_request_id: string };
        Returns: void;
      };
      nearby_requests: {
        Args: { p_latitude: number; p_longitude: number; p_radius_km: number };
        Returns: {
          id: string;
          patient_name: string;
          blood_group: BloodGroup;
          units: number;
          urgency: RequestUrgency;
          hospital_name: string;
          hospital_city: string | null;
          status: RequestStatus;
          created_at: string;
          expires_at: string | null;
          distance_km: number;
        }[];
      };
      respond_to_emergency_request: {
        Args: { p_request_id: string; p_response: RequestResponse };
        Returns: void;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: void;
      };
      request_detail_for_donor: {
        Args: { p_request_id: string };
        Returns: {
          id: string;
          patient_name: string;
          blood_group: BloodGroup;
          units: number;
          urgency: RequestUrgency;
          hospital_name: string;
          hospital_city: string | null;
          status: RequestStatus;
          created_at: string;
          expires_at: string | null;
          distance_km: number | null;
          my_response: RequestResponse | null;
          notification_status: NotificationStatus | null;
        }[];
      };
      request_responses_for_owner: {
        Args: { p_request_id: string };
        Returns: {
          response_id: string;
          donor_id: string;
          full_name: string;
          blood_group: BloodGroup;
          distance_km: number | null;
          response: RequestResponse;
          responded_at: string;
        }[];
      };
      expire_requests: {
        Args: Record<string, never>;
        Returns: number;
      };
      claim_push_jobs: {
        Args: { p_limit: number };
        Returns: {
          job_id: string;
          notification_id: string | null;
          user_notification_id: string | null;
        }[];
      };
    };
    Enums: {
      blood_group: BloodGroup;
      donor_status: DonorStatus;
      request_urgency: RequestUrgency;
      request_status: RequestStatus;
      notification_status: NotificationStatus;
      donation_status: DonationStatus;
      report_status: ReportStatus;
      report_type: ReportType;
      request_response: RequestResponse;
      user_notification_type: UserNotificationType;
      push_status: PushStatus;
    };
  };
}