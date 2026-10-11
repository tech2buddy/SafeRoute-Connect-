export function addDemoMapLayer(map) {
    const layer = L.featureGroup();
    const samples = [
        [[-28.746,24.757],'DEMO: sample robbery report'],
        [[-28.7545,24.763],'DEMO: sample assault report'],
        [[-28.7605,24.752],'DEMO: sample caution area'],
    ];
    for (const [point,title] of samples) {
        const popup = document.createElement('div');
        const heading = document.createElement('strong'); heading.textContent = title;
        const note = document.createElement('p'); note.textContent = 'Fictional school-project example. No real crime is claimed here. Not used for live warnings or route safety.';
        popup.append(heading,note);
        L.circleMarker(point,{radius:11,color:'#137a43',fillColor:'#f4d36b',fillOpacity:1,weight:3,dashArray:'4 3'})
            .addTo(layer).bindPopup(popup).bindTooltip('DEMO ONLY',{permanent:true,direction:'top'});
    }
    const control = L.control({position:'topright'});
    control.onAdd = () => {
        const box = L.DomUtil.create('div','demo-map-control');
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Show demo examples'; button.setAttribute('aria-pressed','false');
        const label = document.createElement('small'); label.textContent = 'Fictional markers - not real incidents'; label.hidden = true;
        button.addEventListener('click', () => {
            const enabled = !map.hasLayer(layer);
            if (enabled) { layer.addTo(map); map.fitBounds(layer.getBounds(),{padding:[30,30],maxZoom:14}); } else map.removeLayer(layer);
            button.setAttribute('aria-pressed',String(enabled)); button.textContent = enabled ? 'Hide demo examples' : 'Show demo examples'; label.hidden = !enabled;
        });
        box.append(button,label); L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box); return box;
    };
    control.addTo(map);
}
