// Foreground browser guidance, not background or safety-aware navigation.
export function setupJourney({ map, fetchRoute, setStatus, onRoute }) {
    const start = document.getElementById('start-journey');
    const end = document.getElementById('end-journey');
    const recenter = document.getElementById('follow-journey');
    const panel = document.getElementById('journey-guidance');
    const direction = document.getElementById('journey-direction');
    const progress = document.getElementById('journey-progress');
    let route, destination, watch = null, marker, radius;
    let active = false, following = true, generation = 0, lastPoint;

    function stop(announce = true) {
        map.getContainer().closest('.route-workbench')?.classList.remove('is-navigating');
        generation++;
        active = false;
        if (watch !== null) navigator.geolocation.clearWatch(watch);
        watch = null;
        if (marker) map.removeLayer(marker);
        if (radius) map.removeLayer(radius);
        marker = radius = null;
        panel.hidden = end.hidden = recenter.hidden = true;
        start.disabled = !route;
        if (announce) setStatus('Journey ended. Live journey tracking stopped.');
    }

    function instruction(step) {
        const maneuver = step.maneuver;
        if (maneuver.type === 'arrive') return 'Arrive at your destination';
        const road = step.name ? ` onto ${step.name}` : '';
        if (maneuver.type === 'roundabout' || maneuver.type === 'rotary') {
            return `At the roundabout, take exit ${maneuver.exit || 'shown on the map'}${road}`;
        }
        if (maneuver.type === 'depart') return `Head ${maneuver.modifier || 'along the route'}${road}`;
        return `${maneuver.type.replaceAll('_', ' ')} ${maneuver.modifier || 'straight'}${road}`;
    }

    function update(position) {
        const { latitude:lat, longitude:lng, accuracy } = position.coords;
        lastPoint = L.latLng(lat, lng);
        if (!marker) {
            marker = L.circleMarker(lastPoint, { radius:9, color:'#fff', weight:3, fillColor:'#2563eb', fillOpacity:1 }).addTo(map).bindTooltip('Your live position');
            radius = L.circle(lastPoint, { color:'#2563eb', weight:1, fillOpacity:.08 }).addTo(map);
        }
        marker.setLatLng(lastPoint);
        radius.setLatLng(lastPoint).setRadius(accuracy);
        if (following) map.setView(lastPoint, 17, { animate:false });

        // Project the fix onto each road segment, rather than only its vertices.
        const coordinates = route.geometry.coordinates;
        const scale = Math.cos(lat * Math.PI / 180);
        let nearest = Infinity, along = 0, traversed = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const a = coordinates[i - 1], b = coordinates[i];
            const ax = (a[0] - lng) * scale, ay = a[1] - lat;
            const dx = (b[0] - a[0]) * scale, dy = b[1] - a[1];
            const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
            const projected = L.latLng(a[1] + t * (b[1] - a[1]), a[0] + t * (b[0] - a[0]));
            const length = L.latLng(a[1], a[0]).distanceTo(L.latLng(b[1], b[0]));
            const distance = lastPoint.distanceTo(projected);
            if (distance < nearest) { nearest = distance; along = traversed + t * length; }
            traversed += length;
        }
        const remaining = Math.max(0, traversed - along);
        if (accuracy <= 50 && lastPoint.distanceTo(L.latLng(destination.lat, destination.lng)) < 25) {
            stop(false);
            panel.hidden = false;
            direction.textContent = 'You have arrived near your destination.';
            progress.textContent = 'Journey tracking stopped.';
            setStatus('Journey complete. Check your surroundings for the final entrance.', 'success');
            return;
        }
        const steps = route.legs.flatMap(leg => leg.steps || []);
        let offset = 0, next = steps[steps.length - 1], distanceToTurn = remaining;
        for (const step of steps) {
            if (offset > along + 12) { next = step; distanceToTurn = offset - along; break; }
            offset += step.distance;
        }
        direction.textContent = accuracy > 100 ? 'GPS accuracy is low. Directions may be unreliable.'
            : nearest > Math.max(60, accuracy * 2) ? 'You appear off route. End the journey and preview a new route.'
            : next ? `In ${Math.round(distanceToTurn)} m: ${instruction(next)}` : 'Follow the blue route on the map';
        progress.textContent = `${(remaining / 1000).toFixed(1)} km remaining on route | GPS accuracy approximately ${Math.round(accuracy)} m`;
    }

    start.addEventListener('click', async () => {
        if (!route || !navigator.geolocation) {
            setStatus('Preview a route and enable browser location before starting.', 'error');
            return;
        }
        stop(false);
        const request = generation;
        active = true;
        start.disabled = true;
        end.hidden = false;
        setStatus('Getting your current location and preparing your journey...', 'loading');
        try {
            const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:20000, maximumAge:0 }));
            if (generation !== request) return;
            const point = { lat:position.coords.latitude, lng:position.coords.longitude };
            const newRoute = await fetchRoute(point, destination);
            if (generation !== request) return;
            route = newRoute;
            onRoute(route, point, destination);
            following = true;
            panel.hidden = recenter.hidden = false;
            map.getContainer().closest('.route-workbench')?.classList.add('is-navigating');
            map.invalidateSize();
            update(position);
            if (!active) return;
            setStatus('Journey started. The map follows your live position.', 'success');
            watch = navigator.geolocation.watchPosition(update, error => {
                stop(false);
                setStatus(error.code === 1 ? 'Location permission denied. Journey tracking stopped.' : 'Live location unavailable. Journey tracking stopped; try again.', 'error');
            }, { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
        } catch (error) {
            if (generation !== request) return;
            stop(false);
            setStatus(error.code === 1 ? 'Allow location access to start your journey.' : error.message || 'Unable to start journey.', 'error');
        }
    });
    map.on('dragstart', () => { following = false; });
    recenter.addEventListener('click', () => { following = true; if (lastPoint) map.setView(lastPoint, 17); });
    end.addEventListener('click', () => stop());
    window.addEventListener('pagehide', () => stop(false));
    return {
        stop,
        invalidate() { stop(false); route = null; start.disabled = true; },
        setRoute(value, target) { route = value; destination = target; start.disabled = false; },
    };
}
