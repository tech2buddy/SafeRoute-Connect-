import { supabase } from './supabase-client.js';
import { tileUrl, tileOptions } from './map-basemap.js';
import { readIncidentFeed, appendProvenance } from './incident-feed.js';
import { addDemoMapLayer } from './demo-map-layer.js';
import { setupIncidentComposer } from './incident-composer.js';

const labels = { safe: 'Low concern', moderate: 'Use caution', risky: 'High risk' };
const colors = { safe: '#149347', moderate: '#f59e0b', risky: '#ef4444' };
function makeMap(id) {
    const map = L.map(id).setView([-28.7383, 24.7634], 13);
    L.tileLayer(tileUrl, tileOptions).addTo(map);
    map.attributionControl.setPrefix(false);
    return map;
}
function locate(map, callback, status) {
    if (!navigator.geolocation) { status.textContent = 'Location is not supported. Choose a point on the map.'; return; }
    status.textContent = 'Finding your location...';
    navigator.geolocation.getCurrentPosition(position => {
        const point = [position.coords.latitude, position.coords.longitude];
        map.setView(point, 17);
        callback(point);
        status.textContent = `Location accuracy: approximately ${Math.round(position.coords.accuracy)} m. Confirm the position on the map.`;
    }, () => { status.textContent = 'Location unavailable. Allow location access or choose a point on the map.'; },
    { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
}
function textElement(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
}
function title(report) { return report.incident_type.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }
async function getReports() {
    return readIncidentFeed();
}
const form = document.getElementById('supabase-incident-form');
if (form) {
    const map = makeMap('incident-location-map');
    const status = document.getElementById('incident-status');
    const button = form.querySelector('[type="submit"]');
    let coordinates = null;
    let marker;
    const select = point => {
        coordinates = point;
        if (marker) marker.setLatLng(point);
        else marker = L.circleMarker(point, { color:'#149347', radius:9 }).addTo(map);
        document.getElementById('incident-coordinates').textContent = `Incident position: ${point[0].toFixed(6)}, ${point[1].toFixed(6)}`;
    };
    map.on('click', event => select([event.latlng.lat, event.latlng.lng]));
    setupIncidentComposer(form, map, () => Boolean(coordinates));
    document.getElementById('incident-locate').addEventListener('click', () => locate(map, select, status));
    button.disabled = false;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        button.disabled = true;
        try {
            if (!coordinates) throw new Error('Select the incident position on the map first.');
            const { data, error } = await supabase.auth.getUser();
            if (error || !data.user) throw new Error('Please sign in before submitting an incident.');
            const fields = new FormData(form);
            const occurred = fields.get('occurred_at');
            const occurredAt = occurred ? new Date(occurred) : new Date();
            if (occurredAt > new Date()) throw new Error('The incident time cannot be in the future.');
            const { error: saveError } = await supabase.from('incidents').insert({
                user_id:data.user.id, incident_type:fields.get('incident_type'),
                location:fields.get('location').trim(), severity:fields.get('severity'),
                description:fields.get('description').trim(), occurred_at:occurredAt.toISOString(),
                latitude:coordinates[0], longitude:coordinates[1],
            });
            if (saveError) throw saveError;
            location.assign('/map/');
        } catch (error) { status.textContent = error.message || 'Unable to save. Please try again.'; }
        finally { button.disabled = false; }
    });
    const list = document.querySelector('.report-list');
    list.replaceChildren(textElement('p', 'Loading saved reports...'));
    try {
        const reports = await getReports();
        list.replaceChildren();
        for (const report of reports.slice(0,5)) {
            const row = textElement('div', ''); row.className = 'report-item';
            const icon = textElement('span', '!');
            icon.className = `report-icon report-${report.severity}`;
            icon.setAttribute('aria-hidden', 'true');
            const copy = textElement('div', '');
            copy.className = 'report-copy';
            copy.append(textElement('strong', title(report)), textElement('small', report.location));
            const severity = textElement('span', labels[report.severity]);
            severity.className = `route-risk-tag ${report.severity}`;
            row.append(icon, copy, severity);
            list.append(row);
        }
        if (!reports.length) list.append(textElement('p', 'No saved reports yet. Sign in to view community incidents.'));
    } catch { list.replaceChildren(textElement('p', 'Could not load saved reports. Please sign in and retry.')); }
}
if (document.getElementById('safety-map-canvas')) {
    const map = makeMap('safety-map-canvas');
    addDemoMapLayer(map);
    const status = document.getElementById('safety-map-status');
    const list = document.querySelector('.safety-map-feed-list');
    const layer = L.featureGroup().addTo(map);
    let userMarker;
    document.getElementById('safety-map-locate').addEventListener('click', () => locate(map, point => {
        if (userMarker) userMarker.setLatLng(point);
        else userMarker = L.circleMarker(point, { color:'#2563eb', radius:8 }).addTo(map).bindTooltip('You are here');
    }, status));
    async function refresh() {
        status.textContent = 'Loading community incidents...';
        try {
            const { data } = await supabase.auth.getUser();
            if (!data.user) throw new Error('Sign in to view community incident markers.');
            const reports = await getReports();
            layer.clearLayers(); list.replaceChildren();
            const counts = { safe:0, moderate:0, risky:0 };
            for (const report of reports) {
                counts[report.severity]++;
                const popup = document.createElement('div');
                popup.append(textElement('strong', title(report)), textElement('p', report.location), textElement('p', report.description));
                appendProvenance(popup, report);
                const marker = L.circleMarker([report.latitude, report.longitude], { color:colors[report.severity], radius:8, weight:3 }).addTo(layer).bindPopup(popup);
                const row = document.createElement('button'); row.type = 'button'; row.className = 'app-feed-card safety-map-feed-item';
                row.append(textElement('strong', title(report)), textElement('p', `${report.location} · ${labels[report.severity]}`), textElement('p', report.description), textElement('small', new Date(report.occurred_at).toLocaleString()));
                row.addEventListener('click', () => { map.setView(marker.getLatLng(), 16); marker.openPopup(); });
                appendProvenance(row, report, false);
                list.append(row);
            }
            const values = document.querySelectorAll('.app-alert-stat-grid .dashboard-stat-value');
            [counts.safe, counts.moderate, counts.risky, reports.length].forEach((value, index) => { values[index].textContent = value; });
            if (reports.length) map.fitBounds(layer.getBounds(), { padding:[24,24], maxZoom:16 });
            else list.append(textElement('p', 'No incidents reported yet.'));
            status.textContent = `${reports.length} saved incidents shown. Use Locate Me to find your position.`;
        } catch (error) {
            layer.clearLayers();
            document.querySelectorAll('.app-alert-stat-grid .dashboard-stat-value').forEach(node => { node.textContent = '--'; });
            status.textContent = error.message;
            list.replaceChildren(textElement('p', error.message));
        }
    }
    const refreshButton = textElement('button', 'Refresh incidents');
    refreshButton.type = 'button'; refreshButton.className = 'app-inline-button';
    refreshButton.addEventListener('click', async () => {
        refreshButton.disabled = true;
        try { await refresh(); } finally { refreshButton.disabled = false; }
    });
    document.getElementById('safety-map-locate').after(refreshButton);
    await refresh();
}
