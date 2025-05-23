// Functions to control zoom
import { ZOOM_PRESETS, MIN_ZOOM, MAX_ZOOM } from './ZoomConstants';

// Get the next zoom level up from the current zoom
export function getNextZoomLevel(currentZoom: number): number {
  // Find the next preset zoom level higher than current
  for (let i = 0; i < ZOOM_PRESETS.length; i++) {
    if (ZOOM_PRESETS[i].value > currentZoom) {
      return ZOOM_PRESETS[i].value;
    }
  }
  // If no higher preset is found, return the max zoom
  return MAX_ZOOM;
}

// Get the next zoom level down from the current zoom
export function getPrevZoomLevel(currentZoom: number): number {
  // Find the next preset zoom level lower than current
  for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
    if (ZOOM_PRESETS[i].value < currentZoom) {
      return ZOOM_PRESETS[i].value;
    }
  }
  // If no lower preset is found, return the min zoom
  return MIN_ZOOM;
}

export function zoomIn() {
  try {
    if (window.documentViewer) {
      const currentZoom = window.documentViewer.getZoomLevel();
      // No need to zoom if already at max
      if (currentZoom >= MAX_ZOOM) return false;
      
      // Get next zoom level
      const nextZoom = getNextZoomLevel(currentZoom);
      console.log(`Zooming in from ${currentZoom} to ${nextZoom}`);
      
      // Apply the zoom
      window.documentViewer.zoomTo(nextZoom);
      return true;
    } else {
      console.warn("Document viewer not available for zoom in");
      return false;
    }
  } catch (err) {
    console.error("Error when zooming in:", err);
    return false;
  }
}

export function zoomOut() {
  try {
    if (window.documentViewer) {
      const currentZoom = window.documentViewer.getZoomLevel();
      // No need to zoom if already at min
      if (currentZoom <= MIN_ZOOM) return false;
      
      // Get previous zoom level
      const prevZoom = getPrevZoomLevel(currentZoom);
      console.log(`Zooming out from ${currentZoom} to ${prevZoom}`);
      
      // Apply the zoom
      window.documentViewer.zoomTo(prevZoom);
      return true;
    } else {
      console.warn("Document viewer not available for zoom out");
      return false;
    }
  } catch (err) {
    console.error("Error when zooming out:", err);
    return false;
  }
}

// Set zoom to specific level (accepts decimal, e.g., 1.0 for 100%)
export function setZoom(zoomLevel: number) {
  try {
    if (window.documentViewer) {
      // Enforce zoom limits
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
      console.log('Setting zoom to:', clampedZoom);
      
      // Apply the zoom
      window.documentViewer.zoomTo(clampedZoom);
      return true;
    } else {
      console.warn("Document viewer not available for setting zoom");
      return false;
    }
  } catch (err) {
    console.error("Error when setting zoom:", err);
    return false;
  }
}

// You could add more zoom-related utilities here
export function zoomToFit() {
  try {
    if (window.documentViewer) {
      window.documentViewer.zoomToFit();
    } else {
      console.warn("Document viewer not available for zoom to fit");
    }
  } catch (err) {
    console.error("Error when zooming to fit:", err);
  }
}

export function zoomToWidth() {
  try {
    if (window.documentViewer) {
      window.documentViewer.zoomToWidth();
    } else {
      console.warn("Document viewer not available for zoom to width");
    }
  } catch (err) {
    console.error("Error when zooming to width:", err);
  }
}

// Get current zoom level safely
export function getCurrentZoom(): number | null {
  try {
    if (window.documentViewer) {
      return window.documentViewer.getZoomLevel();
    }
    return null;
  } catch {
    return null;
  }
}

// Check if at min zoom level
export function isAtMinZoom(): boolean {
  const currentZoom = getCurrentZoom();
  return currentZoom !== null && currentZoom <= MIN_ZOOM;
}

// Check if at max zoom level
export function isAtMaxZoom(): boolean {
  const currentZoom = getCurrentZoom();
  return currentZoom !== null && currentZoom >= MAX_ZOOM;
} 