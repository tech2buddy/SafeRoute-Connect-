import { supabase } from './supabase-client.js';

export async function readIncidentFeed() {
    const [community, imported] = await Promise.all([
        supabase.from('incidents').select('*').order('created_at', { ascending:false }).limit(200),
        supabase.from('published_incidents').select('*').gt('expires_at', new Date().toISOString()).order('occurred_at', { ascending:false }).limit(200),
    ]);
    if (community.error) throw community.error;
    // Keep community reports usable before the import migration is deployed.
    if (imported.error) console.warn('Imported incident feed is unavailable:', imported.error.code);
    return [...community.data.map(report => ({ ...report, origin:'community' })),
        ...(imported.error ? [] : imported.data.map(report => ({ ...report, origin:'imported' })))]
        .sort((a,b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0,200);
}

export function appendProvenance(container, report, includeSource = true) {
    const note = document.createElement('small');
    note.style.cssText = 'display:block;margin-top:8px;line-height:1.6';
    note.textContent = report.origin === 'imported'
        ? `Reviewed source report | ${report.location_precision === 'approximate' ? 'Approximate area, not an exact incident position' : 'Reviewed location'} | Event: ${new Date(report.occurred_at).toLocaleString()}`
        : 'Community report - not independently verified';
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
