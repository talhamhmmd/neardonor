-- Enable required extensions. PostGIS powers geospatial proximity matching
-- without ever exposing exact coordinates to other users.
create extension if not exists postgis with schema extensions;
