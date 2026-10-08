-- Phase 3: server-authoritative request operations.
--
-- create_emergency_request
--   Creates the request, matches eligible donors server-side, creates their
--   notification rows, sets the lifecycle status, writes the requester inbox
--   entry and queues outbound pushes. The client only submits the request.
--
-- respond_to_emergency_request
--   Atomic accept/decline. Validates auth, donor profile, availability,
--   compatibility, blocks, active/not-expired status and server-computed
--   distance, then inserts a response under UNIQUE(request_id, donor_id).
--   Re-taps and duplicate deliveries are idempotent.
--
-- All lifecycle transitions happen here (or in cancel_request / expire_requests)
-- and are security-definer: clients can never UPDATE emergency_requests.status.

-- Queue a push job for a donor notification or a user notification.
create or replace function public.enqueue_push(
  p_notification_id uuid default null,
  p_user_notification_id uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_queue (notification_id, user_notification_id)
  values (p_notification_id, p_user_notification_id)
  on conflict do nothing;
$$;

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
  matched integer := 0;
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

  -- Server-side matching: eligible, available, compatible, unblocked donors
  -- within their own bounded search radius. Never exposes donor coordinates.
  insert into public.notifications (request_id, donor_id, distance_km)
  select new_request.id, nd.donor_id, nd.distance_km
  from public.nearby_eligible_donors(new_request.blood_group, p_latitude, p_longitude, 100) nd
  on conflict (request_id, donor_id) do nothing;

  select count(*) into matched
  from public.notifications
  where request_id = new_request.id;

  -- Lifecycle: donors were notified -> 'notified'; none in range -> 'matching'.
  update public.emergency_requests
  set status = case when matched > 0 then 'notified' else 'matching' end,
      updated_at = now()
  where id = new_request.id
  returning * into new_request;

  -- Requester inbox: immediate feedback on matching progress.
  insert into public.user_notifications (user_id, request_id, type, title, body)
  values (
    auth.uid(),
    new_request.id,
    'emergency_request',
    'Request created',
    case
      when matched > 0 then format('%s donor(s) notified nearby', matched)
      else 'Searching for compatible donors nearby'
    end
  );

  -- Queue a push to every newly notified donor (idempotent via unique job).
  insert into public.push_queue (notification_id)
  select id
  from public.notifications
  where request_id = new_request.id and status = 'pending'
  on conflict do nothing;

  return new_request;
end;
$$;

grant execute on function public.create_emergency_request(
  text, public.blood_group, integer, public.request_urgency, text, text, double precision, double precision, text, text
) to authenticated;

-- Atomic donor response. Race-safe: the unique constraint is the final line of
-- defense against duplicate responses; concurrent inserts never corrupt state.
create or replace function public.respond_to_emergency_request(
  p_request_id uuid,
  p_response public.request_response
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_donor public.profiles;
  v_request public.emergency_requests;
  v_responded public.request_response;
  v_accepted_count integer;
  v_bound numeric;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Donor profile checks.
  select * into v_donor from public.profiles where id = v_uid;
  if not found then
    raise exception 'Donor profile not found';
  end if;
  if v_donor.blood_group is null then
    raise exception 'Complete your profile before responding';
  end if;
  if p_response = 'accepted' and v_donor.donor_status <> 'available' then
    raise exception 'Turn on donor availability before accepting';
  end if;

  -- Request checks.
  select * into v_request from public.emergency_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.requester_id = v_uid then
    raise exception 'You cannot respond to your own request';
  end if;
  if v_request.status not in ('pending', 'matching', 'notified', 'accepted') then
    raise exception 'This request is no longer accepting responses';
  end if;
  if v_request.expires_at is not null and now() >= v_request.expires_at then
    raise exception 'This request has expired';
  end if;

  -- Block relationship in either direction.
  if exists (
    select 1 from public.blocks
    where (blocker_id = v_uid and blocked_id = v_request.requester_id)
       or (blocker_id = v_request.requester_id and blocked_id = v_uid)
  ) then
    raise exception 'You cannot respond to this request';
  end if;

  -- Existing response? Idempotent for the same value (covers double taps and
  -- duplicate notification deliveries); conflicting values are rejected.
  select response into v_responded
  from public.request_responses
  where request_id = p_request_id and donor_id = v_uid;

  if v_responded is not null then
    if v_responded = p_response then
      return;
    end if;
    raise exception 'You have already responded to this request';
  end if;

  -- Server-side distance check: never trust the client. The donor must be
  -- within their own bounded search radius of the hospital location.
  if v_donor.location is not null and v_request.hospital_location is not null then
    v_bound := least(greatest(v_donor.search_radius_km, 1), 100);
    if extensions.ST_Distance(v_donor.location, v_request.hospital_location) / 1000.0 > v_bound then
      raise exception 'This request is outside your search radius';
    end if;
  end if;

  -- Atomic insert; UNIQUE(request_id, donor_id) blocks any duplicates.
  insert into public.request_responses (request_id, donor_id, response)
  values (p_request_id, v_uid, p_response)
  on conflict (request_id, donor_id) do nothing;

  -- Mark the donor's pipeline notification as responded.
  update public.notifications
  set status = p_response::text::public.notification_status,
      responded_at = now(),
      updated_at = now()
  where request_id = p_request_id and donor_id = v_uid;

  if p_response = 'accepted' then
    select count(*) into v_accepted_count
    from public.request_responses
    where request_id = p_request_id and response = 'accepted';

    -- Fulfil only when the accepted help actually covers the requested units;
    -- multiple donors may be needed for a single request.
    if v_accepted_count >= v_request.units then
      update public.emergency_requests
      set status = 'fulfilled', updated_at = now()
      where id = p_request_id;

      insert into public.user_notifications (user_id, request_id, type, title, body)
      values (
        v_request.requester_id, p_request_id, 'request_fulfilled',
        'Help confirmed',
        format('%s donor(s) have offered enough help for this request.', v_accepted_count)
      );

      insert into public.user_notifications (user_id, request_id, type, title, body)
      select rr.donor_id, p_request_id, 'request_fulfilled',
             'Help confirmed',
             'This request has enough help. Thank you for offering.'
      from public.request_responses rr
      where rr.request_id = p_request_id and rr.response = 'accepted';
    else
      update public.emergency_requests
      set status = 'accepted', updated_at = now()
      where id = p_request_id and status <> 'fulfilled';

      insert into public.user_notifications (user_id, request_id, type, title, body)
      values (
        v_request.requester_id, p_request_id, 'donor_accepted',
        'A donor offered to help',
        format('%s of %s unit(s) covered so far.', v_accepted_count, v_request.units)
      );
    end if;

    -- Donor inbox for their own acceptance.
    insert into public.user_notifications (user_id, request_id, type, title, body)
    values (
      v_uid, p_request_id, 'donor_accepted',
      'You are helping',
      'You responded to this request. The requester has been notified.'
    );

    -- Queue pushes: requester (accepted/fulfilled) and the donor.
    insert into public.push_queue (user_notification_id)
    select id
    from public.user_notifications
    where request_id = p_request_id
      and (user_id = v_request.requester_id or user_id = v_uid)
    on conflict do nothing;
  end if;

  return;
end;
$$;

grant execute on function public.respond_to_emergency_request(uuid, public.request_response) to authenticated;

-- A requester may cancel their own non-terminal request. Stops matching,
-- expires outstanding donor notifications, and lets responding donors know.
create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid;
begin
  update public.emergency_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
    and requester_id = auth.uid()
    and status not in ('cancelled', 'expired', 'fulfilled')
  returning requester_id into v_requester;

  if v_requester is null then
    raise exception 'Request not found or not cancellable';
  end if;

  -- Stop matching: expire outstanding donor notifications.
  update public.notifications
  set status = 'expired', updated_at = now()
  where request_id = p_request_id and status = 'pending';

  -- Requester inbox.
  insert into public.user_notifications (user_id, request_id, type, title, body)
  values (auth.uid(), p_request_id, 'request_cancelled', 'Request cancelled', 'Your request was cancelled.');

  -- Let donors who offered help know the request is cancelled.
  insert into public.user_notifications (user_id, request_id, type, title, body)
  select rr.donor_id, p_request_id, 'request_cancelled',
         'Request cancelled',
         'The requester cancelled this request. Thanks for offering to help.'
  from public.request_responses rr
  where rr.request_id = p_request_id and rr.response = 'accepted';

  -- Queue pushes for everyone affected by the cancellation.
  insert into public.push_queue (user_notification_id)
  select id
  from public.user_notifications
  where request_id = p_request_id and type = 'request_cancelled'
  on conflict do nothing;
end;
$$;

grant execute on function public.cancel_request(uuid) to authenticated;

-- Mark one of my inbox notifications as read.
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_notifications
  set is_read = true, read_at = now()
  where id = p_notification_id and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

-- Donor-safe request detail: request facts + the donor's own distance and
-- response. Deliberately excludes contact numbers, notes and requester info.
create or replace function public.request_detail_for_donor(p_request_id uuid)
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
  distance_km numeric,
  my_response public.request_response,
  notification_status public.notification_status
)
language sql
security definer
set search_path = public
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
    (select n.distance_km from public.notifications n
      where n.request_id = r.id and n.donor_id = auth.uid()),
    (select rr.response from public.request_responses rr
      where rr.request_id = r.id and rr.donor_id = auth.uid()),
    (select n.status from public.notifications n
      where n.request_id = r.id and n.donor_id = auth.uid())
  from public.emergency_requests r
  where r.id = p_request_id
    and r.requester_id <> auth.uid()
    and (
      r.status in ('pending', 'matching', 'notified')
      or exists (
        select 1 from public.request_responses rr
        where rr.request_id = r.id and rr.donor_id = auth.uid()
      )
    );
$$;

grant execute on function public.request_detail_for_donor(uuid) to authenticated;

-- Owner-safe response list: donor display name, blood group, distance and
-- response state. Never phone numbers or coordinates.
create or replace function public.request_responses_for_owner(p_request_id uuid)
returns table (
  response_id uuid,
  donor_id uuid,
  full_name text,
  blood_group public.blood_group,
  distance_km numeric,
  response public.request_response,
  responded_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    rr.id,
    rr.donor_id,
    p.full_name,
    p.blood_group,
    n.distance_km,
    rr.response,
    rr.updated_at
  from public.request_responses rr
  join public.profiles p on p.id = rr.donor_id
  left join public.notifications n
    on n.request_id = rr.request_id and n.donor_id = rr.donor_id
  where rr.request_id = p_request_id
    and exists (
      select 1 from public.emergency_requests r
      where r.id = p_request_id and r.requester_id = auth.uid()
    )
  order by rr.created_at asc;
$$;

grant execute on function public.request_responses_for_owner(uuid) to authenticated;

-- Server-side expiration. Safe to call repeatedly (a request expires once);
-- best invoked by the scheduled expire-requests Edge Function.
create or replace function public.expire_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.emergency_requests
  set status = 'expired', updated_at = now()
  where status in ('pending', 'matching', 'notified')
    and expires_at is not null
    and expires_at < now();

  get diagnostics v_count = row_count;

  if v_count > 0 then
    -- Stop matching: expire outstanding donor notifications.
    update public.notifications n
    set status = 'expired', updated_at = now()
    from public.emergency_requests r
    where n.request_id = r.id
      and r.status = 'expired'
      and n.status = 'pending';

    -- Requester inbox (guarded so repeated runs do not duplicate rows).
    insert into public.user_notifications (user_id, request_id, type, title, body)
    select r.requester_id, r.id, 'request_expired', 'Request expired',
           'No donor responded before the request expired.'
    from public.emergency_requests r
    where r.status = 'expired'
      and not exists (
        select 1 from public.user_notifications un
        where un.request_id = r.id and un.user_id = r.requester_id and un.type = 'request_expired'
      );
  end if;

  return v_count;
end;
$$;

-- Worker helper for the send-push-notifications Edge Function. Atomically
-- claims pending jobs (SKIP LOCKED prevents two workers double-processing).
create or replace function public.claim_push_jobs(p_limit integer default 20)
returns table (
  job_id uuid,
  notification_id uuid,
  user_notification_id uuid
)
language sql
security definer
set search_path = public
as $$
  update public.push_queue
  set status = 'processing',
      claimed_at = now(),
      attempts = attempts + 1
  where id in (
    select id from public.push_queue
    where status = 'pending' and attempts < 10
    order by created_at
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  returning id, notification_id, user_notification_id;
$$;

-- A donor can no longer mark their own pipeline notification as responded
-- directly; all responses flow through respond_to_emergency_request.
drop policy "notifications_update_own" on public.notifications;