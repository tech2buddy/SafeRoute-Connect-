import { supabase } from './supabase-client.js';
import { tileUrl, tileOptions } from './map-basemap.js';
import { readIncidentFeed, appendProvenance } from './incident-feed.js';

const map = L.map('dashboard-route-map', { zoomControl:true, scrollWheelZoom:true, dragging:true, touchZoom:true }).setView([-28.7381,24.7638],13);
L.tileLayer(tileUrl, tileOptions).addTo(map);
map.attributionControl.setPrefix(false);
const status = document.getElementById('dashboard-map-status');
const incidents = L.featureGroup().addTo(map);
let userMarker, accuracyCircle;
document.getElementById('dashboard-locate').addEventListener('click', () => {
    if (!navigator.geolocation) { status.textContent = 'Location is not supported on this device.'; return; }
    status.textContent = 'Finding your position...';
    navigator.geolocation.getCurrentPosition(position => {
        const point = [position.coords.latitude,position.coords.longitude];
        if (userMarker) map.removeLayer(userMarker);
        if (accuracyCircle) map.removeLayer(accuracyCircle);
        userMarker = L.circleMarker(point,{ radius:8,color:'#2563eb',fillOpacity:1 }).addTo(map).bindTooltip('You are here');
        accuracyCircle = L.circle(point,{ radius:position.coords.accuracy,color:'#2563eb',fillOpacity:.08,weight:1 }).addTo(map);
        map.setView(point,14);
        status.textContent = `Your location is blue. Accuracy approximately ${Math.round(position.coords.accuracy)} m. Zoom out to explore nearby reports.`;
    }, () => { status.textContent = 'Location unavailable. You can still pan and zoom to explore incidents.'; },
    { enableHighAccuracy:true,timeout:20000,maximumAge:0 });
});
let initialFit=true;
async function refreshMarkers() {
try {
    const { data:auth,error:authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Sign in to see community incidents.');
    const data = await readIncidentFeed();
    incidents.clearLayers();
    for (const report of data) {
        const popup = document.createElement('div');
        for (const text of [report.incident_type.replaceAll('_',' '),report.location,report.description,new Date(report.occurred_at).toLocaleString()]) {
            const line = document.createElement('p'); line.textContent = text; popup.append(line);
        }
        appendProvenance(popup, report);
        L.circleMarker([report.latitude,report.longitude],{
            radius:9,color:{ safe:'#149347',moderate:'#f59e0b',risky:'#ef4444' }[report.severity],weight:3,fillOpacity:.8,
        }).addTo(incidents).bindPopup(popup);
    }
    map.invalidateSize();
    if (data.length && initialFit) { map.fitBounds(incidents.getBounds(),{ padding:[30,30],maxZoom:14 }); initialFit=false; }
    status.textContent = `${data.length} incident reports loaded (up to 200 most recent). Pan, zoom, or tap a marker for details.`;
} catch (error) { status.textContent = error.message || 'Unable to load incident markers.'; }
}
await refreshMarkers();
document.addEventListener('presentation-feed-updated',refreshMarkers);
