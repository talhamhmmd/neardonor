import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { isSupabaseConfigured } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "../hooks/useLocation";
import { useRequests } from "../hooks/useRequests";
import { useNetworkStatus } from "../hooks/useNetwork";
import {
  Input,
  BloodGroupSelector,
  UrgencySelector,
  PrimaryButton,
  DangerButton,
  Card,
  LocationPermissionCard,
  OfflineState,
} from "../components";
import type { BloodGroup, RequestUrgency } from "../types";

const TOTAL_STEPS = 5;
const UNITS = [1, 2, 3, 4, 5];

/**
 * Emergency request as a guided 5-step wizard. Each step validates before
 * advancing. Submission guards against double-taps and only sends exact
 * coordinates when location permission is granted (still required, since the
 * server matches donors around the hospital location).
 */
export default function EmergencyRequestScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { location, permission, requestPermission, refreshLocation } = useLocation();
  const { createRequest, loading: submitting, error } = useRequests();
  const network = useNetworkStatus();

  const configured = isSupabaseConfigured();
  const isOnline = network === "online";

  const [step, setStep] = useState(1);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [urgency, setUrgency] = useState<RequestUrgency>("urgent");
  const [units, setUnits] = useState(1);
  const [patientName, setPatientName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [hospital, setHospital] = useState("");
  const [hospitalCity, setHospitalCity] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLocalError("");
  }, [step]);

  function validateStep(current: number): boolean {
    setLocalError("");
    switch (current) {
      case 1:
        if (!bloodGroup) {
          setLocalError("Please select the required blood group");
          return false;
        }
        return true;
      case 3:
        if (!patientName || !contactNumber) {
          setLocalError("Please enter patient name and contact number");
          return false;
        }
        return true;
      case 4:
        if (!hospital) {
          setLocalError("Please enter the hospital name");
          return false;
        }
        if (permission !== "granted" || !location) {
          setLocalError("Location access is required to create a request");
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function handleBack() {
    setLocalError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!configured) {
      setLocalError("Backend not configured. Add Supabase credentials to .env");
      return;
    }
    if (!validateStep(step)) return;
    if (submitted || submitting) return;

    setSubmitted(true);
    try {
      const created = await createRequest({
        patient_name: patientName,
        blood_group: bloodGroup as BloodGroup,
        units,
        urgency,
        hospital_name: hospital,
        hospital_city: hospitalCity || null,
        latitude: location?.latitude as number,
        longitude: location?.longitude as number,
        contact_number: contactNumber,
        notes: notes || null,
      });
      if (created?.id) {
        router.replace(`/request/${created.id}`);
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (e) {
      setSubmitted(false);
      setLocalError(
        e instanceof Error ? e.message : "Failed to create request. Please try again.",
      );
    }
  }

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <>
            <BloodGroupSelector
              label="Required Blood Group"
              value={bloodGroup}
              onChange={(v) => {
                setBloodGroup(v);
                setLocalError("");
              }}
              required
            />
            <Text className="text-ink-secondary text-caption">
              Which blood group does the patient urgently need?
            </Text>
          </>
        );
      case 2:
        return (
          <>
            <UrgencySelector value={urgency} onChange={setUrgency} />
            <View className="mt-4">
              <Text className="text-label text-ink mb-2">Units Needed</Text>
              <View className="flex-row gap-3">
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnits(u)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: units === u }}
                    className={`w-14 h-14 rounded-xl items-center justify-center border-2 ${
                      units === u ? "border-primary bg-[#EAF0FF]" : "border-border bg-surface"
                    }`}
                  >
                    <Text className={`font-bold text-lg ${units === u ? "text-primary" : "text-ink"}`}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <Input
              label="Patient Name"
              placeholder="Enter patient name"
              value={patientName}
              onChangeText={setPatientName}
              required
              autoCapitalize="words"
            />
            <Input
              label="Contact Number"
              placeholder="Enter contact number"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              maxLength={15}
              required
            />
            <Input
              label="Notes (optional)"
              placeholder="Additional notes"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </>
        );
      case 4:
        return (
          <>
            <Input
              label="Hospital Name"
              placeholder="Enter hospital name"
              value={hospital}
              onChangeText={setHospital}
              required
              autoCapitalize="words"
            />
            <Input
              label="Hospital City (optional)"
              placeholder="Enter city"
              value={hospitalCity}
              onChangeText={setHospitalCity}
              autoCapitalize="words"
            />
            <View className="mt-2">
              <LocationPermissionCard
                state={permission}
                onRequest={requestPermission}
                onOpenSettings={() => Linking.openSettings()}
                onRetry={refreshLocation}
              />
            </View>
          </>
        );
      default:
        return (
          <Card>
            <ReviewRow label="Blood group" value={bloodGroup ?? "-"} />
            <ReviewRow label="Urgency" value={urgency} />
            <ReviewRow label="Units" value={String(units)} />
            <ReviewRow label="Patient" value={patientName} />
            <ReviewRow label="Hospital" value={hospital} />
            {hospitalCity ? <ReviewRow label="City" value={hospitalCity} /> : null}
            <ReviewRow label="Contact" value={contactNumber} />
            {notes ? <ReviewRow label="Notes" value={notes} /> : null}
          </Card>
        );
    }
  }

  if (!isOnline) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <OfflineState fullScreen />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="bg-primary px-6 pt-16 pb-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleBack} accessibilityRole="button" className="p-2">
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Emergency Request</Text>
          <Text className="text-white/90 text-caption font-semibold">
            {step} / {TOTAL_STEPS}
          </Text>
        </View>
        <View className="flex-row gap-2 mt-4">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i + 1 <= step ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-ink text-lg font-semibold mb-4">
          {step === TOTAL_STEPS ? "Review your request" : `Step ${step} of ${TOTAL_STEPS}`}
        </Text>
        {renderStep()}

        {localError || (step === TOTAL_STEPS ? error : null) ? (
          <Text className="text-danger text-caption text-center mt-4">
            {localError || error}
          </Text>
        ) : null}

        <View className="mt-6 mb-12">
          {step < TOTAL_STEPS ? (
            <PrimaryButton title="Continue" onPress={handleNext} size="lg" />
          ) : (
            <DangerButton
              title="SUBMIT EMERGENCY REQUEST"
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
              leftIcon={<Ionicons name="flash-outline" size={22} color={colors.white} />}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-border last:border-b-0">
      <Text className="text-ink-secondary text-caption">{label}</Text>
      <Text className="text-ink font-semibold text-caption capitalize">{value}</Text>
    </View>
  );
}