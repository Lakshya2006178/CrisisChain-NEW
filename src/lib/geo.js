// Shared coordinate parsing for map components. Prefers numeric
// latitude/longitude fields (what the backend now sends) and falls back to
// the legacy "lat, lng" joined string for any older/mock data that only has
// `coordinates`. Returns null (never throws) so callers can just skip
// rendering a marker when a location genuinely isn't known.
export function parseAlertLatLng(alert) {
  if (alert.latitude != null && alert.longitude != null) {
    const lat = Number(alert.latitude);
    const lng = Number(alert.longitude);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  if (typeof alert.coordinates === 'string') {
    const parts = alert.coordinates.split(',').map((s) => Number(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  }
  return null;
}
