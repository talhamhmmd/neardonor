import { BloodGroup } from "../types";

export const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

export function isCompatible(donorBloodGroup: BloodGroup, patientBloodGroup: BloodGroup): boolean {
  return COMPATIBILITY_MAP[patientBloodGroup]?.includes(donorBloodGroup) ?? false;
}

export function getCompatibleDonors(patientBloodGroup: BloodGroup): BloodGroup[] {
  return COMPATIBILITY_MAP[patientBloodGroup] ?? [];
}
