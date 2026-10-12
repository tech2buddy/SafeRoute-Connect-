import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';

export async function readIncidentFeed({strict=false}={}) {
    if(presentationMode()) {
        const [reports,features]=await Promise.all([
            supabase.from('incidents').select('*').eq('is_presentation',true).neq('status','resolved').order('created_at',{ascending:false}).limit(200),
            supabase.from('presentation_features').select('*').eq('feature_kind','support'),
        ]);
        if(reports.error || features.error)throw reports.error || features.error;
        return [...reports.data.map(row=>({...row,origin:'presentation',feature_kind:'hazard',is_demo:true})),...features.data.map(row=>({...row,origin:'presentation',feature_kind:'support',incident_type:row.title,is_demo:true,occurred_at:new Date().toISOString()}))];
    }
    const [community, imported] = await Promise.all([
        supabase.from('incidents').select('*').eq('is_presentation',false).order('created_at', { ascending:false }).limit(200),
        supabase.from('published_incidents').select('*').gt('expires_at', new Date().toISOString()).order('occurred_at', { ascending:false }).limit(200),
    ]);
    if (community.error) throw community.error;
    if (strict && imported.error) throw imported.error;
    // Keep community reports usable before the import migration is deployed.
    if (imported.error) console.warn('Imported incident feed is unavailable:', imported.error.code);
    return [...community.data.filter(report=>report.status!=='resolved').map(report => ({ ...report, origin:'community' })),
        ...(imported.error ? [] : imported.data.map(report => ({ ...report, origin:'imported' })))]
        .sort((a,b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0,200);
}

export function appendProvenance(container, report, includeSource = true) {
    const note = document.createElement('small');
    note.style.cssText = 'display:block;margin-top:8px;line-height:1.6';
    note.textContent = report.origin === 'imported'
        ? `Reviewed source report | ${report.location_precision === 'approximate' ? 'Approximate area, not an exact incident position' : 'Reviewed location'} | Event: ${new Date(report.occurred_at).toLocaleString()}`
        : 'Community report - not independently verified';
    if(report.origin==='presentation')note.textContent=report.feature_kind==='support' ? 'Presentation route feature' : 'Presentation workspace report';
    container.append(note);
    if (report.origin === 'imported' && includeSource) {
        try {
            const url = new URL(report.source_url);
            if (url.protocol !== 'https:') return;
            const link = document.createElement('a');
            link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
            link.textContent = `Source: ${report.source_name}`;
            container.append(link);
        } catch { /* Invalid provenance links are never rendered. */ }
    }
}
