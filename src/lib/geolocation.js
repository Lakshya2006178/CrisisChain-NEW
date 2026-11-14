// CrisisChain Universal Geolocation & Spatial Verification Engine
// Provides high-accuracy device geolocation, permission management,
// accuracy classification, and graceful multi-tier fallbacks for global emergency reporting.

const HIGH_ACCURACY_OPTS = {
  enableHighAccuracy: true,
  timeout: 12000, // 12 seconds gives device radios sufficient time to lock
  maximumAge: 0   // Force fresh reading, never return stale cache on initial request
};

const RELAXED_ACCURACY_OPTS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 30000 // Accept up to 30s old cached position on retry
};

function mapGeoError(err) {
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      return {
        code: 'DENIED',
        message: 'Location access was denied. Please allow location permissions in your browser or set location manually.',
        isDenied: true
      };
    case 2: // POSITION_UNAVAILABLE
      return {
        code: 'UNAVAILABLE',
        message: 'Your device was unable to determine its current position. Check that system Location Services are enabled.',
        isUnavailable: true
      };
    case 3: // TIMEOUT
      return {
        code: 'TIMEOUT',
        message: 'Location request timed out. You can retry, enter an address, or pinpoint on the map below.',
        isTimeout: true
      };
    default:
      return {
        code: 'UNKNOWN',
        message: err.message || 'Unable to retrieve your location.',
        isUnknown: true
      };
  }
}

function queryBrowserPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 'UNSUPPORTED', message: 'Geolocation is not supported by your browser.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy, // In meters
        altitude: pos.coords.altitude || null,
        heading: pos.coords.heading || null,
        speed: pos.coords.speed || null,
        timestamp: pos.timestamp,
        source: 'device'
      }),
      (err) => reject(mapGeoError(err)),
      options
    );
  });
}

/**
 * Detects gross geographical anomalies between reported coordinates and local device system clock timezone.
 * Earth rotates 15 degrees per hour. If the longitude of the reading differs by more than 3.5 hours (~52 degrees)
 * from the device system clock, it strongly indicates Wi-Fi database misattribution (e.g. laptop Wi-Fi mapped to Brazil
 * while the system clock is in India).
 */
export function detectTimezoneLongitudeMismatch(lat, lng) {
  if (lng == null || isNaN(lng)) return { isAnomalous: false };
  try {
    const tzOffsetMinutes = -new Date().getTimezoneOffset(); // e.g. +330 for IST (+5:30)
    const solarLongitude = (tzOffsetMinutes / 60) * 15; // approximate solar noon longitude
    let lngDiff = Math.abs(lng - solarLongitude);
    if (lngDiff > 180) lngDiff = 360 - lngDiff;
    const hoursDiff = lngDiff / 15;
    return {
      isAnomalous: hoursDiff > 3.5,
      hoursDiff: Math.round(hoursDiff * 10) / 10,
      solarLongitude
    };
  } catch {
    return { isAnomalous: false };
  }
}

/**
 * Checks current browser geolocation permission status without prompting.
 * Returns: 'granted' | 'prompt' | 'denied' | 'unsupported'
 */
export async function checkGeolocationPermission() {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return navigator?.geolocation ? 'prompt' : 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state; // 'granted', 'prompt', or 'denied'
  } catch {
    return navigator.geolocation ? 'prompt' : 'unsupported';
  }
}

/**
 * High-accuracy device geolocation with controlled retry mechanism.
 * Tries high accuracy first; if timeout or unavailable, retries with relaxed accuracy.
 * Never retries if permission was explicitly denied.
 */
export async function getDeviceLocation(onProgress) {
  if (!navigator.geolocation) {
    throw { code: 'UNSUPPORTED', message: 'Geolocation is not supported by this browser.' };
  }

  if (typeof onProgress === 'function') onProgress('Acquiring high-accuracy device position...');

  let pos;
  try {
    pos = await queryBrowserPosition(HIGH_ACCURACY_OPTS);
  } catch (firstErr) {
    // If permission was denied, do not attempt to retry
    if (firstErr.code === 'DENIED') {
      throw firstErr;
    }

    // Controlled retry with relaxed parameters if signal timed out or position unavailable
    if (typeof onProgress === 'function') onProgress('Retrying position lock with relaxed accuracy...');
    try {
      pos = await queryBrowserPosition(RELAXED_ACCURACY_OPTS);
    } catch {
      // Throw the initial, more informative error if retry also fails
      throw firstErr;
    }
  }

  // Cross-reference coordinate longitude with device system timezone offset
  const tzCheck = detectTimezoneLongitudeMismatch(pos.lat, pos.lng);
  if (tzCheck.isAnomalous) {
    pos.isAnomalous = true;
    pos.hoursDiff = tzCheck.hoursDiff;
  }

  return pos;
}

// Alias for backward compatibility
export const getPreciseLocation = getDeviceLocation;

/**
 * Best-effort fallback helper for components (e.g. DashboardContext, ResourceInventory).
 * Tries device location first; if unavailable, falls back to approximate IP.
 */
export async function captureBestEffortLocation() {
  try {
    return await getDeviceLocation();
  } catch (deviceErr) {
    try {
      return await getApproximateLocationByIP();
    } catch {
      throw deviceErr;
    }
  }
}

/**
 * Classifies reported accuracy (in meters) into user-friendly tactical categories.
 * Thresholds:
 *   <= 50m: High accuracy (Mobile GNSS / Satellite or tight Wi-Fi)
 *   51m - 500m: Moderate accuracy (Standard Wi-Fi triangulation)
 *   > 500m: Low / Coarse accuracy (Cellular tower or weak Wi-Fi positioning)
 */
export function classifyAccuracy(accuracyMeters) {
  if (accuracyMeters == null || isNaN(accuracyMeters)) {
    return {
      level: 'unknown',
      label: 'Unspecified accuracy',
      badgeColor: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
      isPoor: false,
      description: 'Device did not report accuracy tolerance.'
    };
  }

  const meters = Math.round(accuracyMeters);

  if (meters <= 50) {
    return {
      level: 'high',
      label: `High accuracy (±${meters}m)`,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      isPoor: false,
      description: 'Precise coordinates suitable for direct emergency dispatch.'
    };
  }

  if (meters < 500) {
    return {
      level: 'moderate',
      label: `Moderate accuracy (±${meters}m)`,
      badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      isPoor: false,
      description: 'Standard Wi-Fi triangulation reading.'
    };
  }

  return {
    level: 'low',
    label: `Low accuracy (±${meters}m)`,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    isPoor: true,
    description: 'Coarse position reading (±500m+). Please drag or tap the pin on the map to refine.'
  };
}

/**
 * Reverse geocode latitude and longitude to street address using OpenStreetMap Nominatim.
 * Works globally for all countries and coordinates.
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.display_name) {
      // Split into informative parts (road/suburb, city/district, state/country)
      const parts = data.display_name.split(', ').map(p => p.trim());
      // Return concise top 3-4 segments
      return parts.slice(0, 3).join(', ');
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Parses latitude and longitude from user-entered or pasted text.
 * Supports global coordinates: lat -90 to +90, lng -180 to +180.
 * Examples: "12.824513, 74.876315", "-5.585770, -47.435741", "Lat: 12.82, Lng: 74.87"
 */
export function parseCoordinates(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Try pattern with optional comma and label prefixes (e.g. "Lat: 40.71, Lng: -74.00" or "40.71, -74.00")
  const match = text.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(?:lng:?|long:?|lon:?)?\s*(-?\d{1,3}(?:\.\d+)?)/i) ||
                text.match(/(?:lat:?)?\s*(-?\d{1,2}(?:\.\d+)?)[,\s]+(?:lng:?|long:?|lon:?)?\s*(-?\d{1,3}(?:\.\d+)?)/i);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }
  return null;
}

/**
 * Last-resort approximate IP location lookup.
 * Explicitly tagged as approximate with city/regional estimation.
 */
export async function getApproximateLocationByIP() {
  try {
    // 1. Try our server endpoint first (avoids browser CORS & rate limits)
    const backendRes = await fetch('/api/alerts/detect-location', { signal: AbortSignal.timeout(4000) });
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.success && data.latitude != null && data.longitude != null) {
        return {
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          accuracy: 25000, // Explicit coarse radius (~25km city level)
          source: 'approximate-ip',
          approx: true,
          city: data.city,
          region: data.region,
          country: data.country,
          label: `${data.city || 'Regional ISP Hub'}, ${data.region || ''}, ${data.country || ''}`.trim()
        };
      }
    }
  } catch {
    // Fall through to public external provider
  }

  // 2. Direct external fallback
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude != null && data.longitude != null) {
        return {
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          accuracy: 25000,
          source: 'approximate-ip',
          approx: true,
          city: data.city,
          region: data.region,
          country: data.country,
          label: `${data.city}, ${data.region}, ${data.country}`
        };
      }
    }
  } catch {
    // All fallbacks exhausted
  }

  throw new Error('Unable to retrieve approximate IP network location.');
}
