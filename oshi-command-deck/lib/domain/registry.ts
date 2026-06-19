import branches from "@/config/branches.json";
import talents from "@/config/talents.demo.json";
import { createRegistryConfig } from "./registry-config";
import type { BranchConfig, Talent } from "./types";

const registry = createRegistryConfig({
  branches,
  talents
});

export const branchRegistry: BranchConfig[] = registry.branches;
export const demoTalents: Talent[] = registry.talents;
