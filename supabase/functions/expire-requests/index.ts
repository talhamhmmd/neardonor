// expire-requests
//
// Scheduled worker: flips overdue requests to 'expired' and notifies the
// requester. Run on a cron schedule (e.g. every 5 minutes) via the Supabase
// Dashboard, or manually:
//
//   curl -X POST https://<project>.functions.supabase.co/expire-requests \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//     -H "Content-Type: application/json" -d '{}'
//
// All expiry logic lives in the security-definer RPC expire_requests(); this
// function only invokes it with the service-role client (never the app key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const workerSecret = Deno.env.get("WORKER_SECRET") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = req.headers.get("authorization") ?? "";
  const secret = req.headers.get("x-worker-secret") ?? "";
  const isServiceRole = auth === `Bearer ${serviceRoleKey}`;
  const isSecret = Boolean(workerSecret) && secret === workerSecret;
  if (!isServiceRole && !isSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: expired, error } = await client.rpc("expire_requests");

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ expired: expired ?? 0 });
});
