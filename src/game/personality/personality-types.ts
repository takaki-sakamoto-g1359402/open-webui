export type PersonalityVector = {
  stability: number;
  creativity: number;
  community: number;
  efficiency: number;
  autonomy: number;
};

export type PriorityVector = {
  foodSecurity: number;
  construction: number;
  research: number;
  socialCare: number;
  exploration: number;
};

export type RoleAffinityVector = {
  builder: number;
  gatherer: number;
  planner: number;
  caretaker: number;
  hauler: number;
};

export type CharacterVisualProfile = {
  archetype: string;
  visualTheme: string;
  hairColor: [number, number, number];
  skinColor: [number, number, number];
  outfitColor: [number, number, number];
  accentColor: [number, number, number];
  eyeColor: [number, number, number];
};

export type PersonalityProfile = {
  id: string;
  name: string;
  simulationLabel: string;
  role: string;
  character: CharacterVisualProfile;
  values: PersonalityVector;
  priorities: PriorityVector;
  workStyle: "steady" | "burst" | "analytical" | "adaptive" | "supportive";
  socialTendency: number;
  riskTolerance: number;
  obedienceIndependence: number;
  routinePreference: number;
  communicationStyle: string;
  redLines: string[];
  roleAffinity: RoleAffinityVector;
};

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
