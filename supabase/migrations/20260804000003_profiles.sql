-- Profiles: one row per auth user.
--
-- PRIVACY: `location` holds the donor's exact coordinates as PostGIS
-- geography. Row Level Security restricts SELECT to the row owner, so no
-- other user can ever read exact coordinates. Proximity matching is served
-- by the security-definer function `nearby_eligible_donors` (see
-- 09_functions_matching.sql), which returns distance only.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Donor',
  phone text,
  blood_group public.blood_group,
  city text,
  is_donor boolean not null default false,
  is_verified boolean not null default false,
  donor_status public.donor_status not null default 'offline',
  search_radius_km numeric not null default 20 check (search_radius_km > 0 and search_radius_km <= 200),
  notifications_enabled boolean not null default true,
  last_donation_at timestamptz,
  -- Informational only. NearDonor is not a medical authority.
  eligibility_status text not null default 'unknown',
  -- Exact location. NEVER exposed to other users.
  location extensions.geography (Point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.location is
  'Exact donor coordinates. Only the owner and trusted server code may access this column.';

-- Auto-maintained updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row automatically on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Donor'),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security-definer helper so clients can store their exact location without
-- reading or writing anyone else's.
create or replace function public.update_my_location(latitude double precision, longitude double precision)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if latitude is null or longitude is null then
    raise exception 'latitude and longitude are required';
  end if;

  update public.profiles
  set location = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326),
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

grant execute on function public.update_my_location(double precision, double precision) to authenticated;

-- Row Level Security.
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);
