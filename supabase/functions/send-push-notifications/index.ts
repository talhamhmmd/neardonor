// send-push-notifications
//
// Worker that drains `push_queue` and delivers via the Expo Push API.
//
// Invoke on a schedule (Supabase Dashboard -> Cron / Database webhook) or
// manually:
//   curl -X POST https://<project>.functions.supabase.co/send-push-notifications \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//     -H "Content-Type: application/json" -d '{"limit": 20}'
//
// Environment (server-side only - never ship to the mobile app):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided by Supabase)
//   EXPO_ACCESS_TOKEN                         (optional; EAS-backed projects)
//   WORKER_SECRET                             (optional alternate auth via
//                                             `x-worker-secret` header)
//
// Auth: requires the service-role JWT in Authorization, or the worker secret.
// Jobs are claimed atomically via claim_push_jobs (FOR UPDATE SKIP LOCKED);
// the unique constraints on push_queue prevent duplicate sends. Permanently
// invalid Expo tokens are deactivated so they are never retried.
//
// Payloads are deliberately small and contain no phone numbers, no exact
// locations and no medical detail - only a type + request id for deep-linking.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const workerSecret = Deno.env.get("WORKER_SECRET") ?? "";
const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo push error messages that mean "this token is dead - stop using it".
const PERMANENT_TOKEN_ERRORS = new Set([
  "DeviceNotRegistered",
  "InvalidRegistration",
  "MismatchSenderId",
  "InvalidCredentials",
  "InvalidPushToken",
  "BadDeviceToken",
  "MessageTooBig",
]);

interface ClaimedJob {
  job_id: string;
  notification_id: string | null;
  user_notification_id: string | null;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: { type: string; requestId: string | null };
  sound: "default";
  channelId?: string;
  priority?: "high";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendBatch(messages: PushMessage[]) {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    return { ok: false, tickets: null, httpError: `${res.status}` };
  }
  const body = await res.json();
  return { ok: true, tickets: body.data as Record<string, unknown>[], httpError: null };
}

function isPermanentError(ticket: Record<string, unknown>): boolean {
  const message = String(ticket.message ?? "");
  const detail = ticket.details as { error?: string } | undefined;
  const error = String(detail?.error ?? "");
  return PERMANENT_TOKEN_ERRORS.has(error) || PERMANENT_TOKEN_ERRORS.has(message);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Authenticate the worker.
  const auth = req.headers.get("authorization") ?? "";
  const secret = req.headers.get("x-worker-secret") ?? "";
  const isServiceRole = auth === `Bearer ${serviceRoleKey}`;
  const isSecret = Boolean(workerSecret) && secret === workerSecret;
  if (!isServiceRole && !isSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error: claimError } = await client.rpc("claim_push_jobs", {
    p_limit: limit,
  });

  if (claimError) {
    return json({ error: claimError.message }, 500);
  }

  const claimed = (jobs as ClaimedJob[] | null) ?? [];
  const results: Record<string, unknown>[] = [];
  let sent = 0;

  for (const job of claimed) {
    try {
      const outcome = await processJob(client, job);
      results.push(outcome);
      if (outcome.status === "sent") sent += 1;
    } catch (err) {
      results.push({ job_id: job.job_id, status: "failed", error: String(err) });
      await client
        .from("push_queue")
        .update({ status: "failed", processed_at: new Date().toISOString(), last_error: String(err) })
        .eq("id", job.job_id);
    }
  }

  return json({ claimed: claimed.length, sent, results });
});

async function processJob(
  client: ReturnType<typeof createClient>,
  job: ClaimedJob,
): Promise<Record<string, unknown>> {
  const notifications = job.notification_id ? "notifications" : "user_notifications";
  const sourceId = job.notification_id ?? job.user_notification_id;
  const targetColumn = job.notification_id ? "donor_id" : "user_id";

  if (!sourceId) {
    throw new Error("job has no source row");
  }

  const select =
    job.notification_id
      ? "donor_id, request_id"
      : "user_id, request_id, type, title, body";

  const { data: source, error: sourceError } = await client
    .from(notifications)
    .select(select)
    .eq("id", sourceId)
    .single();

  if (sourceError || !source) {
    // Source row vanished - drop the job rather than error forever.
    await client.from("push_queue").update({ status: "failed", processed_at: new Date().toISOString() }).eq("id", job.job_id);
    return { job_id: job.job_id, status: "failed", error: "source row missing" };
  }

  const recipientId = source[targetColumn] as string;

  const { data: tokens, error: tokenError } = await client
    .from("device_tokens")
    .select("token")
    .eq("user_id", recipientId)
    .eq("is_active", true);

  if (tokenError) throw tokenError;

  const activeTokens = (tokens ?? []).map((t) => t.token as string);
  if (activeTokens.length === 0) {
    await client.from("push_queue").update({ status: "sent", processed_at: new Date().toISOString() }).eq("id", job.job_id);
    return { job_id: job.job_id, status: "sent", devices: 0 };
  }

  const isDonorPush = Boolean(job.notification_id);
  const title = isDonorPush
    ? "Emergency blood request nearby"
    : (source.title as string);
  const bodyText = isDonorPush
    ? "A compatible blood request is available near you."
    : (source.body as string);
  const pushType = isDonorPush ? "emergency_request" : (source.type as string);

  const messages: PushMessage[] = activeTokens.map((token) => ({
    to: token,
    title,
    body: bodyText,
    data: { type: pushType, requestId: source.request_id as string | null },
    sound: "default",
    channelId: "emergency",
    priority: "high",
  }));

  const { ok, tickets, httpError } = await sendBatch(messages);
  if (!ok) {
    await client.from("push_queue").update({ status: "failed", processed_at: new Date().toISOString(), last_error: `expo http ${httpError}` }).eq("id", job.job_id);
    return { job_id: job.job_id, status: "failed", error: `expo http ${httpError}` };
  }

  // Classify each ticket; deactivate permanently-invalid tokens.
  const deadTokens: string[] = [];
  let delivered = 0;

  tickets?.forEach((ticket, index) => {
    const token = activeTokens[index];
    if (ticket.status === "ok") {
      delivered += 1;
      return;
    }
    if (isPermanentError(ticket) && token) {
      deadTokens.push(token);
    }
  });

  if (deadTokens.length > 0) {
    await client.from("device_tokens").update({ is_active: false }).in("token", deadTokens);
  }

  const status = delivered > 0 ? "sent" : "failed";
  await client.from("push_queue").update({
    status,
    processed_at: new Date().toISOString(),
    last_error: status === "failed" ? "no devices delivered" : null,
  }).eq("id", job.job_id);

  return { job_id: job.job_id, status, devices: activeTokens.length, delivered };
}
