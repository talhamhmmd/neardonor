-- Performance indexes supporting common queries.

-- Geospatial indexes for proximity queries.
create index if not exists profiles_location_gix
  on public.profiles using gist (location);

create index if not exists emergency_requests_hospital_location_gix
  on public.emergency_requests using gist (hospital_location);

-- Donor discovery by blood group.
create index if not exists profiles_blood_group_is_donor_idx
  on public.profiles (blood_group, is_donor)
  where is_donor = true;

-- Active request listing.
create index if not exists emergency_requests_status_idx
  on public.emergency_requests (status);

create index if not exists emergency_requests_blood_status_idx
  on public.emergency_requests (blood_group, status);

create index if not exists emergency_requests_requester_idx
  on public.emergency_requests (requester_id);

-- Notification lookups.
create index if not exists notifications_donor_status_idx
  on public.notifications (donor_id, status);

create index if not exists notifications_request_idx
  on public.notifications (request_id);

-- History and device-token lookups.
create index if not exists donations_donor_idx
  on public.donations (donor_id);

create index if not exists device_tokens_user_idx
  on public.device_tokens (user_id);

-- Safety lookups.
create index if not exists reports_request_idx
  on public.reports (target_request_id);

create index if not exists reports_target_user_idx
  on public.reports (target_user_id);

create index if not exists blocks_blocked_idx
  on public.blocks (blocked_id);
