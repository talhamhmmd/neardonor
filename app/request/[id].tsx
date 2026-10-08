import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { colors } from "../../constants/theme";
import { isSupabaseConfigured } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useRequests } from "../../hooks/useRequests";
import { useNetworkStatus } from "../../hooks/useNetwork";
import { toUserFacingMessage } from "../../lib/errors";
import {
  Avatar,
  BloodBadge,
  StatusBadge,
  UrgencyBadge,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  LoadingState,
  ErrorState,
  OfflineState,
  ConfirmationModal,
  EmptyState,
  Badge,
} from "../../components";
import type {
  EmergencyRequest,
  DonorRequestDetail,
  OwnerResponse,
  RequestResponse,
} from "../../types";
import { formatDate, formatTimeAgo } from "../../utils/helpers";

const CANCELLABLE: EmergencyRequest["status"][] = [
  "pending",
  "matching",
  "notified",
  "accepted",
];

type ViewMode = "owner" | "donor";

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    getRequestById,
    getDonorRequestDetail,
    getRequestResponses,
    respondToRequest,
    cancelRequest,
    loading,
  } = useRequests();
  const network = useNetworkStatus();

  const [mode, setMode] = useState<ViewMode | null>(null);
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [donorDetail, setDonorDetail] = useState<DonorRequestDetail | null>(null);
  const [responses, setResponses] = useState<OwnerResponse[]>([]);
  const [respondedSuccess, setRespondedSuccess] = useState(false);
  const [responding, setResponding] = useState<RequestResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const configured = isSupabaseConfigured();
  const isOnline = network === "online";

  const load = useCallback(async () => {
    if (!id || !isAuthenticated || !configured || !isOnline) return;
    setActionError(null);
    setNotFound(false);

    const own = await getRequestById(id);
    if (own && user && own.requester_id === user.id) {
      setMode("owner");
      setRequest(own);
      setResponses(await getRequestResponses(id));
      return;
    }

    const donor = await getDonorRequestDetail(id);
    if (donor) {
      setMode("donor");
      setDonorDetail(donor);
      setRequest(null);
      return;
    }

    setNotFound(true);
  }, [id, isAuthenticated, configured, isOnline, user, getRequestById, getDonorRequestDetail, getRequestResponses]);

  useEffect(() => {
    void load();
  }, [load]);

  // Owner-only realtime: live responses + status updates for their request.
  useEffect(() => {
    if (mode !== "owner" || !id || !isOnline) return;

    const channel = supabase
      .channel(`request-responses-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_responses", filter: `request_id=eq.${id}` },
        () => {
          void getRequestResponses(id).then(setResponses);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emergency_requests", filter: `id=eq.${id}` },
        () => {
          void getRequestById(id).then((r) => r && setRequest(r));
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [mode, id, isOnline, getRequestResponses, getRequestById]);

  async function handleRespond(response: RequestResponse) {
    if (!id || !isOnline || responding) return;
    setResponding(response);
    setActionError(null);
    try {
      await respondToRequest(id, response);
      if (response === "accepted") {
        setRespondedSuccess(true);
      }
      const donor = await getDonorRequestDetail(id);
      if (donor) setDonorDetail(donor);
    } catch (e) {
      setActionError(toUserFacingMessage(e));
    } finally {
      setResponding(null);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setCancelling(true);
    setActionError(null);
    try {
      await cancelRequest(id);
      setConfirmCancel(false);
      await load();
    } catch (e) {
      setActionError(toUserFacingMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  if (!isOnline) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <OfflineState fullScreen />
      </SafeAreaView>
    );
  }

  if (!configured || !isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-ink text-xl font-bold text-center">
            Sign in to view this request
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="bg-surface px-6 pt-16 pb-4 border-b border-border flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" className="p-2">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text className="text-ink text-xl font-bold">Request Details</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {loading || mode === null ? (
          <LoadingState message="Loading request..." />
        ) : notFound ? (
          <ErrorState
            title="Request Unavailable"
            message="This request may have expired, been cancelled, or you may not have access to it."
            onRetry={load}
          />
        ) : mode === "owner" && request ? (
          <OwnerView
            request={request}
            responses={responses}
            onCancel={() => setConfirmCancel(true)}
            onRefresh={load}
          />
        ) : mode === "donor" && donorDetail ? (
          <DonorView
            detail={donorDetail}
            respondedSuccess={respondedSuccess}
            responding={responding}
            actionError={actionError}
            onRespond={handleRespond}
          />
        ) : (
          <ErrorState title="Request Unavailable" message="Unable to load this request." onRetry={load} />
        )}
      </ScrollView>

      {mode === "owner" && request ? (
        <ConfirmationModal
          visible={confirmCancel}
          variant="danger"
          title="Cancel this request?"
          message="This will immediately stop matching donors for this request."
          confirmText="Cancel Request"
          cancelText="Keep Request"
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
          loading={cancelling}
        />
      ) : null}
    </SafeAreaView>
  );
}

/* ------------------------------- OWNER ------------------------------- */

function OwnerView({
  request,
  responses,
  onCancel,
  onRefresh,
}: {
  request: EmergencyRequest;
  responses: OwnerResponse[];
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const accepted = responses.filter((r) => r.response === "accepted");
  const declined = responses.filter((r) => r.response === "declined");
  const canCancel = CANCELLABLE.includes(request.status);

  return (
    <View>
      <View className="px-6 mt-6">
        <View className="bg-surface rounded-xl p-6 border border-border">
          <View className="flex-row items-center gap-4 mb-6">
            <BloodBadge group={request.blood_group} size="lg" />
            <View className="flex-1">
              <Text className="text-ink text-xl font-bold">{request.patient_name}</Text>
              <Text className="text-ink-secondary text-body-small">{request.hospital_name}</Text>
              <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                <UrgencyBadge urgency={request.urgency} />
                <StatusBadge status={request.status} />
              </View>
            </View>
          </View>

          <View className="gap-6">
            <View className="gap-0.5">
              <Text className="text-ink font-semibold">Status</Text>
              <Text className="text-ink-secondary text-body-small leading-5">
                {ownerLifecycleMessage(request.status, accepted.length)}
              </Text>
            </View>

            <View className="gap-4">
              <Row label="Blood Group" value={request.blood_group} />
              <Row label="Units Needed" value={`${request.units}`} />
              <Row label="Created" value={formatTimeAgo(request.created_at)} />
              <Row
                label="Expires"
                value={request.expires_at ? formatDate(request.expires_at) : "—"}
              />
              <Row label="Hospital City" value={request.hospital_city ?? "—"} />
            </View>

            {request.notes ? (
              <View className="bg-background rounded-lg p-4">
                <Text className="text-ink font-medium mb-1">Notes</Text>
                <Text className="text-ink-secondary text-body-small leading-5">{request.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Responses */}
      <View className="px-6 mt-6">
        <Text className="text-ink font-bold text-h3 mb-2">Donor Responses</Text>
        <View className="flex-row gap-3 mb-4">
          <SummaryChip tone="success" value={accepted.length} label="accepted" />
          <SummaryChip tone="neutral" value={responses.length} label="responded" />
          <SummaryChip tone="danger" value={declined.length} label="declined" />
        </View>

        {responses.length === 0 ? (
          <EmptyState
            title={request.status === "matching" ? "Searching for donors…" : "No donors have responded yet"}
            message="Compatible donors near the hospital are being notified. This page updates automatically."
            icon="heart-outline"
          />
        ) : (
          responses.map((r) => (
            <View
              key={r.response_id}
              className="bg-surface rounded-xl p-4 mb-3 border border-border flex-row items-center gap-3"
            >
              <Avatar name={r.full_name} size="md" />
              <View className="flex-1 min-w-0">
                <Text className="text-ink font-semibold text-body">{r.full_name}</Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-ink-secondary text-caption">
                    {r.blood_group} · {r.distance_km != null ? `${r.distance_km} km` : "nearby"}
                  </Text>
                  <Badge
                    label={r.response === "accepted" ? "Accepted" : "Declined"}
                    tone={r.response === "accepted" ? "success" : "neutral"}
                  />
                </View>
              </View>
              {r.response === "accepted" ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              ) : (
                <Ionicons name="close-circle" size={22} color={colors.inkSecondary} />
              )}
            </View>
          ))
        )}
      </View>

      {canCancel ? (
        <View className="px-6 mt-8 mb-12 gap-3">
          <DangerButton
            title="Cancel Request"
            onPress={onCancel}
            leftIcon={<Ionicons name="close-circle-outline" size={20} color={colors.white} />}
          />
        </View>
      ) : null}
      <TouchableOpacity onPress={onRefresh} className="items-center py-2 mb-6">
        <Text className="text-primary font-semibold text-body">Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

function ownerLifecycleMessage(status: EmergencyRequest["status"], accepted: number): string {
  switch (status) {
    case "pending":
      return "Request created and awaiting donor matching.";
    case "matching":
      return "Searching for compatible donors near the hospital…";
    case "notified":
      return accepted > 0
        ? `${accepted} donor(s) have offered help so far.`
        : "Nearby donors have been notified. Waiting for responses…";
    case "accepted":
      return accepted > 0 ? `${accepted} donor(s) have offered help so far.` : "A donor is on the way.";
    case "fulfilled":
      return "Help confirmed. Thank you for using NearDonor.";
    case "cancelled":
      return "This request was cancelled by you.";
    case "expired":
      return "This request expired without being fulfilled.";
    default:
      return "";
  }
}

/* ------------------------------- DONOR ------------------------------- */

function DonorView({
  detail,
  respondedSuccess,
  responding,
  actionError,
  onRespond,
}: {
  detail: DonorRequestDetail;
  respondedSuccess: boolean;
  responding: RequestResponse | null;
  actionError: string | null;
  onRespond: (response: RequestResponse) => void;
}) {
  const router = useRouter();
  const myResponse = respondedSuccess ? "accepted" : detail.my_response;
  const hasResponded = myResponse !== null;

  return (
    <View>
      <View className="px-6 mt-6">
        <View className="bg-surface rounded-xl p-6 border border-border">
          <View className="flex-row items-center gap-4 mb-6">
            <BloodBadge group={detail.blood_group} size="lg" />
            <View className="flex-1">
              <Text className="text-ink text-xl font-bold">{detail.patient_name}</Text>
              <Text className="text-ink-secondary text-body-small">{detail.hospital_name}</Text>
              <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                <UrgencyBadge urgency={detail.urgency} />
                <StatusBadge status={detail.status} />
              </View>
            </View>
          </View>

          <View className="gap-4">
            <Row label="Units Needed" value={`${detail.units}`} />
            <Row label="Approximate Distance" value={detail.distance_km != null ? `${detail.distance_km} km` : "Nearby"} />
            <Row label="Created" value={formatTimeAgo(detail.created_at)} />
            <Row
              label="Expires"
              value={detail.expires_at ? formatDate(detail.expires_at) : "—"}
            />
            <Row label="Hospital City" value={detail.hospital_city ?? "—"} />
          </View>
        </View>
      </View>

      {hasResponded ? (
        <View className="px-6 mt-6">
          <View className="bg-surface rounded-xl p-6 border border-border items-center">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.success + "20" }}
            >
              <Ionicons name="heart" size={30} color={colors.success} />
            </View>
            <Text className="text-ink text-lg font-bold text-center">You're helping</Text>
            <Text className="text-ink-secondary text-body text-center mt-1 leading-6">
              You've responded to this emergency request.
              {myResponse === "accepted"
                ? " The requester has been notified."
                : " The requester can still see this request is active."}
            </Text>
            {detail.status === "fulfilled" ? (
              <Badge label="Request fulfilled" tone="success" />
            ) : null}
          </View>
        </View>
      ) : (
        <View className="px-6 mt-6">
          {actionError ? (
            <Text className="text-danger text-caption text-center mb-4">{actionError}</Text>
          ) : null}
          <View className="gap-3">
            <PrimaryButton
              title="I CAN HELP"
              onPress={() => onRespond("accepted")}
              loading={responding === "accepted"}
              disabled={responding !== null}
              size="lg"
              leftIcon={<Ionicons name="heart-outline" size={20} color={colors.white} />}
            />
            <SecondaryButton
              title="DECLINE"
              onPress={() => onRespond("declined")}
              loading={responding === "declined"}
              disabled={responding !== null}
              size="lg"
            />
            <Text className="text-ink-secondary text-caption text-center mt-2">
              Accepting notifies the requester that you're on the way.
            </Text>
          </View>
        </View>
      )}

      <View className="px-6 mt-8 mb-12">
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/requests")}
          className="items-center py-2"
        >
          <Text className="text-primary font-semibold text-body">See more nearby requests</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------- SHARED ------------------------------- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-border">
      <Text className="text-ink-secondary">{label}</Text>
      <Text className="text-ink font-semibold capitalize">{value}</Text>
    </View>
  );
}

function SummaryChip({ tone, value, label }: { tone: "success" | "danger" | "neutral"; value: number; label: string }) {
  const bg =
    tone === "success" ? "bg-[#E7F6EC]" : tone === "danger" ? "bg-[#FDECEC]" : "bg-[#EAF0FF]";
  const fg =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-primary";
  return (
    <View className={`flex-1 ${bg} rounded-lg px-3 py-2 items-center`}>
      <Text className={`${fg} font-bold text-h3`}>{value}</Text>
      <Text className="text-ink-secondary text-caption">{label}</Text>
    </View>
  );
}