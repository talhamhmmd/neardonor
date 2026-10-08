-- Shared enums for the NearDonor schema.

create type public.blood_group as enum (
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);

-- Donor availability controlled by the donor themselves.
create type public.donor_status as enum (
  'available',
  'unavailable',
  'offline'
);

create type public.request_urgency as enum (
  'critical',
  'urgent',
  'normal'
);

-- Emergency request lifecycle.
create type public.request_status as enum (
  'pending',
  'matching',
  'notified',
  'accepted',
  'fulfilled',
  'cancelled',
  'expired'
);

create type public.notification_status as enum (
  'pending',
  'accepted',
  'declined',
  'maybe_later',
  'expired'
);

create type public.donation_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

create type public.report_status as enum (
  'open',
  'under_review',
  'resolved',
  'dismissed'
);

create type public.report_type as enum (
  'request',
  'user'
);
