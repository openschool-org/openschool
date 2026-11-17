export interface RequirementValues {
  periods: number;
  labPeriods: number;
  doubleBlocks: number;
}

// Lab periods cannot exceed the weekly periods, and a double block needs two of them.
export function clampRequirement(v: RequirementValues): RequirementValues {
  return { periods: v.periods, labPeriods: Math.min(v.labPeriods, v.periods), doubleBlocks: Math.min(v.doubleBlocks, Math.floor(v.periods / 2)) };
}
