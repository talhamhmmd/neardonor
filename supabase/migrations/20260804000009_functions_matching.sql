-- Server-side matching primitives.
--
-- `is_compatible_donor` is used both by RLS policies and by the matching
-- function, keeping compatibility logic in exactly one place.
--
-- `nearby_eligible_donors` answers:
--   "Which eligible, available, compatible donors are within X km?"
-- WITHOUT ever returning donor coordinates. It returns only safe fields plus
-- an approximate distance in km. It is security-definer (trusted server
-- code) and reads the private `location` column, which clients cannot.

create or replace function public.is_compatible_donor(
  donor_group public.blood_group,
  patient_group public.blood_group
)
returns boolean
language sql
immutable
as $$
  select case patient_group
    when 'A+' then donor_group in ('A+', 'A-', 'O+', 'O-')
    when 'A-' then donor_group in ('A-', 'O-')
    when 'B+' then donor_group in ('B+', 'B-', 'O+', 'O-')
    when 'B-' then donor_group in ('B-', 'O-')
    when 'AB+' then donor_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    when 'AB-' then donor_group in ('A-', 'B-', 'AB-', 'O-')
    when 'O+' then donor_group in ('O+', 'O-')
    when 'O-' then donor_group in ('O-')
  end;
$$;

grant execute on function public.is_compatible_donor(public.blood_group, public.blood_group) to authenticated, anon;

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
  select
    p.id,
    p.full_name,
    p.blood_group,
    p.city,
    round((extensions.ST_Distance(
      p.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)
    ) / 1000.0)::numeric, 1) as distance_km,
    p.last_donation_at
  from public.profiles p
  where p.is_donor = true
    and p.donor_status = 'available'
    and p.notifications_enabled = true
    and p.location is not null
    and public.is_compatible_donor(p.blood_group, p_blood_group)
    and extensions.ST_DWithin(
      p.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326),
      p_radius_km * 1000
    )
  order by distance_km asc;
$$;

grant execute on function public.nearby_eligible_donors(public.blood_group, double precision, double precision, numeric) to authenticated;
