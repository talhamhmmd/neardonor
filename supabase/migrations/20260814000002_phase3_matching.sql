-- Phase 3: matching-engine hardening.
--
-- * nearby_eligible_donors now respects each donor's OWN (bounded) search
--   radius, excludes blocked relationships and the caller themselves, and no
--   longer leaks the raw candidate list to clients.
-- * Donors can keep viewing a request after they have responded (terminal
--   states included) without seeing anything they were never eligible for.
-- * nearby_requests applies server-side radius bounds and hides requests the
--   donor has already responded to.

create or replace function public.nearby_eligible_donors(
  p_blood_group public.blood_group,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km numeric default 20
)
returns table (
  donor_id uuid,
  full_name text,
  blood_group public.blood_group,
  city text,
  distance_km numeric,
  last_donation_at timestamptz
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  with params as (
    select
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326) as origin,
      least(greatest(p_radius_km, 1), 100) as bound
  )
  select
    p.id,
    p.full_name,
    p.blood_group,
    p.city,
    round((extensions.ST_Distance(p.location, params.origin) / 1000.0)::numeric, 1) as distance_km,
    p.last_donation_at
  from public.profiles p, params
  where p.id <> auth.uid()
    and p.is_donor = true
    and p.donor_status = 'available'
    and p.notifications_enabled = true
    and p.location is not null
    and p.blood_group is not null
    and public.is_compatible_donor(p.blood_group, p_blood_group)
    and extensions.ST_DWithin(
      p.location,
      params.origin,
      least(p.search_radius_km, params.bound) * 1000
    )
    and not exists (
      select 1 from public.blocks bl
      where (bl.blocker_id = p.id and bl.blocked_id = auth.uid())
         or (bl.blocker_id = auth.uid() and bl.blocked_id = p.id)
    )
  order by distance_km asc;
$$;

-- The requester never needs the raw donor list; matching runs entirely inside
-- security-definer request-creation code. Removing the client grant closes an
-- unnecessary data-exposure surface (donor names/cities must not be browsable).
revoke execute on function public.nearby_eligible_donors(public.blood_group, double precision, double precision, numeric) from authenticated, anon;

-- A donor may view a request while it is actively searching (and they are
-- blood-compatible), or after they have responded so they can see the
-- terminal state of a request they engaged with.
drop policy "requests_select_eligible_donor" on public.emergency_requests;

create policy "requests_select_eligible_donor"
  on public.emergency_requests for select
  using (
    requester_id <> auth.uid()
    and (
      (status in ('pending', 'matching', 'notified')
        and public.is_compatible_donor(
          (select blood_group from public.profiles where id = auth.uid()),
          blood_group
        ))
      or exists (
        select 1 from public.request_responses rr
        where rr.request_id = emergency_requests.id and rr.donor_id = auth.uid()
      )
    )
  );

-- Donor-side request browsing: bounded radius, exclude requests the donor has
-- already responded to.
create or replace function public.nearby_requests(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km numeric default 20
)
returns table (
  id uuid,
  patient_name text,
  blood_group public.blood_group,
  units integer,
  urgency public.request_urgency,
  hospital_name text,
  hospital_city text,
  status public.request_status,
  created_at timestamptz,
  expires_at timestamptz,
  distance_km numeric
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  with params as (
    select
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326) as origin,
      least(greatest(p_radius_km, 1), 100) as bound
  )
  select
    r.id,
    r.patient_name,
    r.blood_group,
    r.units,
    r.urgency,
    r.hospital_name,
    r.hospital_city,
    r.status,
    r.created_at,
    r.expires_at,
    round((extensions.ST_Distance(r.hospital_location, params.origin) / 1000.0)::numeric, 1) as distance_km
  from public.emergency_requests r, params
  where r.status in ('pending', 'matching', 'notified')
    and r.hospital_location is not null
    and r.requester_id <> auth.uid()
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = r.requester_id)
         or (b.blocker_id = r.requester_id and b.blocked_id = auth.uid())
    )
    and not exists (
      select 1 from public.request_responses rr
      where rr.request_id = r.id and rr.donor_id = auth.uid()
    )
    and extensions.ST_DWithin(r.hospital_location, params.origin, params.bound * 1000)
  order by distance_km asc;
$$;

grant execute on function public.nearby_requests(double precision, double precision, numeric) to authenticated;