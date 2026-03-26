// Single source of truth for all valid nav keys
export const VALID_NAV_KEYS = [
  'general',
  'hotkeys',
  'overview',
] as const;

// Derive the type from the array
export type NavKey = typeof VALID_NAV_KEYS[number];
