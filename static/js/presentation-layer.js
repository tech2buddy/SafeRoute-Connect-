import { supabase } from './supabase-client.js';
export function addPresentationLayer(map,onChange) {
    const layer=L.featureGroup();
    let enabled=false, records=[];
    const control=L.control({position:'topright'});
    control.onAdd=()=> {
        const box=L.DomUtil.create('div','demo-map-control');
        const button=document.createElement('button'); button.type='button'; button.textContent='Presentation mode'; button.setAttribute('aria-pressed','false');
        const note=document.createElement('small'); note.hidden=true; note.textContent='Presentation scenarios / not live events';
        button.addEventListener('click',async()=> {
            if(enabled) { enabled=false; map.removeLayer(layer); note.hidden=true; button.setAttribute('aria-pressed','false'); onChange(false,[]); return; }
            button.disabled=true;
            try {
                const {data,error}=await supabase.from('presentation_features').select('*').order('id'); if(error)throw error;
                if(!data.length)throw new Error('No presentation scenarios have been installed.');
                records=data.map(row=>({...row,origin:'presentation',is_demo:true,incident_type:row.title,occurred_at:new Date(Date.now()-row.age_hours*3600000).toISOString()}));
                layer.clearLayers();
                for(const record of records) {
                    const popup=document.createElement('div'); const title=document.createElement('strong'); title.textContent=record.title;
                    const description=document.createElement('p'); description.textContent=record.description;
                    const disclaimer=document.createElement('small'); disclaimer.textContent='Fictional presentation scenario, not a verified feature or live event.'; popup.append(title,description,disclaimer);
                    L.circleMarker([record.latitude,record.longitude],{radius:9,color:record.feature_kind==='support' ? '#159153' : record.severity==='risky' ? '#de594a' : '#d9a123',weight:3,fillOpacity:.8}).addTo(layer).bindPopup(popup).bindTooltip(record.title);
                }
                enabled=true; layer.addTo(map); note.hidden=false; note.textContent='Presentation scenarios / not live events'; button.setAttribute('aria-pressed','true'); onChange(true,records);
                map.fitBounds(layer.getBounds(),{padding:[30,30],maxZoom:14});
            } catch(error) { note.hidden=false; note.textContent=`Unable to load scenarios: ${error.message}`; }
            finally { button.disabled=false; }
        });
        box.append(button,note); L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box); return box;
    }; control.addTo(map);
}
