/**
 * Zoom configuration constants for PDF viewer
 */

export interface ZoomPreset {
  readonly label: string;
  readonly value: number;
}

// Zoom level presets for the PDF viewer
export const ZOOM_PRESETS: readonly ZoomPreset[] = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "90%", value: 0.9 },
  { label: "100%", value: 1.0 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2.0 },
] as const;

// Zoom level boundaries
export const MIN_ZOOM = 0.5 as const; // 50%
export const MAX_ZOOM = 2.0 as const; // 200%

// Default zoom level
export const DEFAULT_ZOOM = 1.0 as const; // 100%

// Zoom step increment for smooth zooming
export const ZOOM_STEP = 0.1 as const; 