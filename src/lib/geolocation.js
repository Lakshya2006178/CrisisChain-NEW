// Shared "find where the user actually is" pipeline.
// Used by ReportIncident, ResourceInventory, and DashboardContext so there's
// one place that owns retry/fallback behavior instead of three copies.
//
// Chain: precise GPS (high accuracy) -> retry with relaxed accuracy ->
// IP-based approximate location. Callers get a consistent { lat, lng, source, accuracy? }
// shape and a human-readable error only if every step fails.

const HIGH_ACCURACY_OPTS = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
const LOW_ACCURACY_OPTS = { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 };

function mapGeoError(err) {
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      return { code: 'DENIED', message: 'Location permission was denied. Allow location access for this site in your browser, then try again.' };
    case 2: // POSITION_UNAVAILABLE
      return { code: 'UNAVAILABLE', message: 'Your device could not determine a position. Check that Location Services are turned on (Windows Settings > Privacy & security > Location).' };
    case 3: // TIMEOUT
      return { code: 'TIMEOUT', message: 'GPS signal timed out. Try again near a window or in an open area.' };
    default:
      return { code: 'UNKNOWN', message: 'Unable to retrieve your location.' };
  }
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: options.enableHighAccuracy ? 'gps' : 'gps-low-accuracy',
      }),
      (err) => reject(mapGeoError(err)),
      options
    );
  });
}

// Tries precise GPS first, falls back to a relaxed-accuracy attempt.
// Throws a mapped { code, message } error if the browser has no geolocation
// API at all, or if the user denies/both attempts fail.
export async function getPreciseLocation() {
  if (!navigator.geolocation) {
    throw { code: 'UNSUPPORTED', message: 'Geolocation is not supported by this browser.' };
  }
  try {
    return await getCurrentPosition(HIGH_ACCURACY_OPTS);
  } catch (firstErr) {
    if (firstErr.code === 'DENIED') throw firstErr; // retrying won't help if permission was denied
    return await getCurrentPosition(LOW_ACCURACY_OPTS);
  }
}

// Coarse fallback (city-level accuracy) based on the caller's public IP.
// Needs no browser permission at all, so it works even when GPS is blocked
// or the device has no location hardware/service running.
export async function getApproximateLocationByIP() {
  const res = await fetch('https://ipapi.co/json/');
  if (!res.ok) throw new Error('IP-based location lookup failed');
  const data = await res.json();
  if (data.latitude == null || data.longitude == null) {
    throw new Error('IP-based location lookup returned no coordinates');
  }
  return {
    lat: data.latitude,
    lng: data.longitude,
    source: 'ip',
    approx: true,
    label: [data.city, data.region, data.country_name].filter(Boolean).join(', '),
  };
}

// Best-effort: real GPS if at all possible, otherwise a clearly-labeled
// approximate IP location, otherwise throws the original GPS error.
export async function captureBestEffortLocation() {
  try {
    return await getPreciseLocation();
  } catch (gpsErr) {
    try {
      return await getApproximateLocationByIP();
    } catch {
      throw gpsErr; // surface the original, more specific GPS error to the user
    }
  }
}

// Reverse-geocode via OpenStreetMap Nominatim. Browsers block custom
// User-Agent headers on fetch, so this relies on Nominatim reading the
// (browser-set) Referer header for identification — it's a soft dependency,
// not a hard requirement, and callers should treat a null return as "fine,
// just show raw coordinates" rather than an error.
export async function reverseGeocode(lat, lng) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.display_name) {
      return data.display_name.split(', ').slice(0, 3).join(', ');
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
