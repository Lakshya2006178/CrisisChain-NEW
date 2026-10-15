// Leaflet's default marker icon references relative image paths that Vite's
// bundler doesn't resolve, so any <Marker> rendered WITHOUT an explicit
// `icon=` prop silently shows a broken image. Every marker in this app
// currently passes a custom divIcon, so this isn't visibly broken today —
// but it's a one-line landmine for the next person who adds a plain
// <Marker>. Import this once (for its side effect) wherever react-leaflet
// is used so the default icon is always safe as a fallback.
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
