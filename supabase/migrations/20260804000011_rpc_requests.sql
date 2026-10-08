-- Server-controlled request operations.
--
-- Clients never build PostGIS geometries or drive lifecycle transitions
-- directly. These security-definer functions own location storage and status
-- changes.

-- Expiry window by urgency: critical 6h, urgent 24h, normal 72h.
create or replace function public.request_expiry(p_urgency public.request_urgency)
returns timestamptz
language sql
immutable
as $$
  select now() + case p_urgency
    when 'critical' then interval '6 hours'
    when 'urgent' then interval '24 hours'
    else interval '72 hours'
  end;
$$;

-- Create a new emergency request on behalf of the authenticated user.
create or replace function public.create_emergency_request(
  p_patient_name text,
  p_blood_group public.blood_group,
  p_units integer,
  p_urgency public.request_urgency,
  p_hospital_name text,
  p_hospital_city text,
  p_latitude double precision,
  p_longitude double precision,
  p_contact_number text default null,
  p_notes text default null
)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_request public.emergency_requests;
begin
  if p_latitude is null or p_longitude is null then
    raise exception 'Hospital location is required';
  end if;

  insert into public.emergency_requests (
    requester_id,
    patient_name,
    blood_group,
    units,
    urgency,
    hospital_name,
    hospital_city,
    hospital_location,
    contact_number,
    notes,
    status,
    expires_at
  )
  values (
    auth.uid(),
    p_patient_name,
    p_blood_group,
    p_units,
    p_urgency,
    p_hospital_name,
    p_hospital_city,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326),
    p_contact_number,
    p_notes,
    'pending',
    public.request_expiry(p_urgency)
  )
  returning * into new_request;

  return new_request;
end;
$$;

grant execute on function public.create_emergency_request(
  text, public.blood_group, integer, public.request_urgency, text, text, double precision, double precision, text, text
) to authenticated;

-- A requester may cancel their own non-terminal request.
create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.emergency_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
    and requester_id = auth.uid()
    and status not in ('cancelled', 'expired', 'fulfilled');

  if not found then
    raise exception 'Request not found or not cancellable';
  end if;
end;
$$;

grant execute on function public.cancel_request(uuid) to authenticated;

-- Privacy-safe nearby request listing for donors.
-- Returns no contact numbers and no requester coordinates, only safe fields
-- plus an approximate distance.
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
    round((extensions.ST_Distance(
      r.hospital_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)
    ) / 1000.0)::numeric, 1) as distance_km
  from public.emergency_requests r
  where r.status in ('pending', 'matching', 'notified')
    and r.hospital_location is not null
    and r.requester_id <> auth.uid()
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = r.requester_id
    )
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = r.requester_id and b.blocked_id = auth.uid()
    )
    and extensions.ST_DWithin(
      r.hospital_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326),
      p_radius_km * 1000
    )
  order by distance_km asc;
$$;

grant execute on function public.nearby_requests(double precision, double precision, numeric) to authenticated;
