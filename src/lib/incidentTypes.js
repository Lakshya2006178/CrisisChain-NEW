// Canonical incident type/severity vocabulary — the single source of truth
// on the frontend for values that get sent to the backend and then read back
// by Alerts/MapPanel/DashboardMain for filtering, coloring and icon lookup.
//
// IMPORTANT: server/controllers/alertController.js keeps its own copy of this
// mapping (Node backend can't import from src/ across the two separate
// package.json roots). If you add/rename a type or severity here, mirror the
// change there too.

export const INCIDENT_TYPES = [
  { value: 'Fire', label: 'Fire', iconName: 'Flame' },
  { value: 'Flood', label: 'Flood / Flash Flood', iconName: 'Droplets' },
  { value: 'Medical Emergency', label: 'Medical Emergency', iconName: 'HeartPulse' },
  { value: 'Road Accident', label: 'Road Accident / Vehicle Collision', iconName: 'AlertTriangle' },
  { value: 'Natural Disaster', label: 'Cyclone / Earthquake / Storm', iconName: 'Wind' },
  { value: 'Structural Collapse', label: 'Structural Collapse', iconName: 'Shield' },
  { value: 'Hazardous Material', label: 'Chemical / Hazmat Spill', iconName: 'Radiation' },
  { value: 'Other', label: 'Other Emergency', iconName: 'AlertTriangle' },
];

export const SEVERITIES = [
  { id: 'Low', label: 'MINOR', color: '#3b82f6' },
  { id: 'Medium', label: 'MODERATE', color: '#f59e0b' },
  { id: 'High', label: 'HIGH DANGER', color: '#ef4444' },
  { id: 'Critical', label: 'LIFE THREATENING', color: '#ef4444' },
];

export const isCriticalSeverity = (severity) => severity === 'Critical' || severity === 'High';

export const severityColor = (severity) => {
  switch (severity) {
    case 'Critical':
    case 'High':
      return '#ef4444';
    case 'Medium':
      return '#f59e0b';
    case 'Low':
    default:
      return '#3b82f6';
  }
};

export const iconNameForType = (type) =>
  INCIDENT_TYPES.find((t) => t.value === type)?.iconName || 'AlertTriangle';
