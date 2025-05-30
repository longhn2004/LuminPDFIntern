/**
 * Zoom control utilities for PDF viewer
 * Provides functions to control document zoom levels with proper error handling
 */

import { ZOOM_PRESETS, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, type ZoomPreset } from './ZoomConstants';

// Comprehensive type declarations for window objects
declare global {
  interface Window {
    Core?: any;
    documentViewer?: {
      // Zoom methods
      getZoomLevel(): number;
      zoomTo(level: number): void;
      zoomToFit(): void;
      zoomToWidth(): void;
      // Document methods
      getDocument(): any;
      getAnnotationManager(): any;
      // Page methods
      getCurrentPage(): number;
      getPageCount(): number;
      setCurrentPage(page: number): void;
      // Tool methods
      setToolMode(tool: any): void;
      getTool(toolName: string): any;
      // Other methods
      closeDocument(): void;
      loadDocument(url: string, options?: any): Promise<void>;
      enableAnnotations(): void;
      addEventListener(event: string, callback: Function): void;
      setScrollViewElement(element: HTMLElement): void;
      setViewerElement(element: HTMLElement): void;
    };
  }
}

/**
 * Get the next zoom level up from the current zoom
 */
export const getNextZoomLevel = (currentZoom: number): number => {
  // Find the next preset zoom level higher than current
  const nextPreset = ZOOM_PRESETS.find(preset => preset.value > currentZoom);
  return nextPreset?.value ?? MAX_ZOOM;
};

/**
 * Get the next zoom level down from the current zoom
 */
export const getPrevZoomLevel = (currentZoom: number): number => {
  // Find the next preset zoom level lower than current (reverse order)
  const prevPreset = [...ZOOM_PRESETS].reverse().find(preset => preset.value < currentZoom);
  return prevPreset?.value ?? MIN_ZOOM;
};

/**
 * Safely execute zoom operations with error handling
 */
const executeZoomOperation = (operation: () => void, operationName: string): boolean => {
  try {
    if (!window.documentViewer) {
      console.warn(`Document viewer not available for ${operationName}`);
      return false;
    }
    
    operation();
    return true;
  } catch (error) {
    console.error(`Error during ${operationName}:`, error);
    return false;
  }
};

/**
 * Zoom in to the next preset level
 */
export const zoomIn = (): boolean => {
  return executeZoomOperation(() => {
    const currentZoom = window.documentViewer!.getZoomLevel();
    
    // No need to zoom if already at max
    if (currentZoom >= MAX_ZOOM) {
      console.info('Already at maximum zoom level');
      return;
    }
    
    const nextZoom = getNextZoomLevel(currentZoom);
    console.log(`Zooming in from ${(currentZoom * 100).toFixed(0)}% to ${(nextZoom * 100).toFixed(0)}%`);
    
    window.documentViewer!.zoomTo(nextZoom);
  }, 'zoom in');
};

/**
 * Zoom out to the previous preset level
 */
export const zoomOut = (): boolean => {
  return executeZoomOperation(() => {
    const currentZoom = window.documentViewer!.getZoomLevel();
    
    // No need to zoom if already at min
    if (currentZoom <= MIN_ZOOM) {
      console.info('Already at minimum zoom level');
      return;
    }
    
    const prevZoom = getPrevZoomLevel(currentZoom);
    console.log(`Zooming out from ${(currentZoom * 100).toFixed(0)}% to ${(prevZoom * 100).toFixed(0)}%`);
    
    window.documentViewer!.zoomTo(prevZoom);
  }, 'zoom out');
};

/**
 * Set zoom to specific level (accepts decimal, e.g., 1.0 for 100%)
 */
export const setZoom = (zoomLevel: number): boolean => {
  return executeZoomOperation(() => {
    // Enforce zoom limits
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
    
    if (clampedZoom !== zoomLevel) {
      console.warn(`Zoom level ${zoomLevel} clamped to ${clampedZoom} (min: ${MIN_ZOOM}, max: ${MAX_ZOOM})`);
    }
    
    console.log(`Setting zoom to ${(clampedZoom * 100).toFixed(0)}%`);
    window.documentViewer!.zoomTo(clampedZoom);
  }, 'set zoom');
};

/**
 * Reset zoom to default level (100%)
 */
export const resetZoom = (): boolean => {
  return setZoom(DEFAULT_ZOOM);
};

/**
 * Zoom to fit the document in the viewer
 */
export const zoomToFit = (): boolean => {
  return executeZoomOperation(() => {
    window.documentViewer!.zoomToFit();
  }, 'zoom to fit');
};

/**
 * Zoom to fit the document width in the viewer
 */
export const zoomToWidth = (): boolean => {
  return executeZoomOperation(() => {
    window.documentViewer!.zoomToWidth();
  }, 'zoom to width');
};

/**
 * Get current zoom level safely
 */
export const getCurrentZoom = (): number | null => {
  try {
    return window.documentViewer?.getZoomLevel() ?? null;
  } catch (error) {
    console.error('Error getting current zoom level:', error);
    return null;
  }
};

/**
 * Check if at minimum zoom level
 */
export const isAtMinZoom = (): boolean => {
  const currentZoom = getCurrentZoom();
  return currentZoom !== null && currentZoom <= MIN_ZOOM;
};

/**
 * Check if at maximum zoom level
 */
export const isAtMaxZoom = (): boolean => {
  const currentZoom = getCurrentZoom();
  return currentZoom !== null && currentZoom >= MAX_ZOOM;
};

/**
 * Get formatted zoom percentage string
 */
export const getZoomPercentage = (zoom?: number): string => {
  const zoomLevel = zoom ?? getCurrentZoom();
  if (zoomLevel === null) return '100%';
  return `${Math.round(zoomLevel * 100)}%`;
};

/**
 * Find matching preset for current zoom level
 */
export const getCurrentZoomPreset = (): ZoomPreset | null => {
  const currentZoom = getCurrentZoom();
  if (currentZoom === null) return null;
  
  return ZOOM_PRESETS.find(preset => Math.abs(preset.value - currentZoom) < 0.01) ?? null;
}; 