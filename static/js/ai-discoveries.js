import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
if (!presentationMode() && ['/routes/','/routes/find/','/community/','/map/','/alerts/'].includes(location.pathname)) {
    const node = (tag,text) => { const element = document.createElement(tag); element.textContent = text; return element; };
    const panel = node('section',''); panel.className = 'dashboard-card ai-discovery-panel';
    const header = node('div',''); header.className = 'ai-discovery-header';
    const intro = node('div','');
    const eyebrow = node('span','COMMUNITY INTELLIGENCE'); eyebrow.className = 'ai-discovery-eyebrow';
    intro.append(eyebrow,node('h2','Found around Kimberley'),node('p','AI-found source reports. Explore the context before treating a discovery as an incident.'));
    const list = node('div',''); list.className = 'ai-discovery-list';
    const status = node('p',''); status.className = 'ai-discovery-status'; status.setAttribute('role','status');
    const refresh = node('button','Refresh discoveries'); refresh.type = 'button'; refresh.className = 'app-inline-button';
    header.append(intro,refresh);
    const notice = node('div','Unverified sources, not live alerts. Event dates and locations are unconfirmed; discoveries do not affect route safety.'); notice.className = 'ai-discovery-notice';
    const suggestions = node('div',''); suggestions.className = 'ai-discovery-searches'; suggestions.hidden = true;
    panel.append(header,notice,status,list,suggestions);
    (document.getElementById('route-explore') || document.querySelector('.dashboard-main')).append(panel);
    async function load() {
        refresh.disabled = true; panel.setAttribute('aria-busy','true');
        status.textContent = 'Loading AI discoveries...'; list.replaceChildren(); suggestions.replaceChildren(); suggestions.hidden = true;
        try {
            const {data:auth} = await supabase.auth.getSession();
            if (!auth.session) throw new Error('Sign in to view AI discoveries.');
            const {data,error} = await supabase.functions.invoke('ai-discoveries',{body:{}});
            if (error) throw new Error('AI discovery feed unavailable. Check the ai-discoveries deployment.');
            if (data.error) throw new Error(data.error);
            const widgets = new Set();
            for (const [index,report] of data.reports.entries()) {
                const card = node('article',''); card.className = 'ai-discovery-card';
                const top = node('div',''); top.className = 'ai-discovery-card-top';
                const badge = node('span','Unverified'); badge.className = 'ai-discovery-badge';
                top.append(node('small',`SOURCE ${String(index+1).padStart(2,'0')}`),badge);
                card.append(top,node('h3',report.source_name));
                const excerpts = node('div',''); excerpts.className = 'ai-discovery-excerpts';
                for (const excerpt of report.excerpts) excerpts.append(node('p',excerpt));
                if (!report.excerpts.length) excerpts.append(node('p','No supported summary is available. Check the original source.'));
                card.append(excerpts);
                const metadata = node('dl',''); metadata.className = 'ai-discovery-metadata';
                const found = new Date(report.discovered_at);
                for (const [label,value] of [['Discovered',Number.isNaN(found.getTime()) ? 'Unknown' : found.toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})],['Event date','Not confirmed'],['Map location','Not assigned']]) {
                    const row = node('div',''); row.append(node('dt',label),node('dd',value)); metadata.append(row);
                }
                card.append(metadata);
                try {
                    const url = new URL(report.source_url);
                    if (url.protocol === 'https:') { const link = node('a','Read original source'); link.className = 'ai-discovery-source'; link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(node('span','\u2197')); card.append(link); }
                } catch { /* Never render invalid source links. */ }
                if (report.search_entry_point && !widgets.has(report.search_entry_point)) {
                    widgets.add(report.search_entry_point);
                    // Provider HTML stays in a script-free sandbox, isolated from the app.
                    const frame = document.createElement('iframe'); frame.title = 'Google Search suggestions';
                    frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');
                    frame.srcdoc = `<meta name="color-scheme" content="light"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">${report.search_entry_point}`;
                    frame.className = 'ai-search-suggestions';
                    if (suggestions.hidden) { suggestions.append(node('small','Related Google searches')); suggestions.hidden = false; }
                    suggestions.append(frame);
                }
                list.append(card);
            }
            status.textContent = data.reports.length ? `${data.reports.length} unverified discoveries. No map positions assigned.` : 'No recent discoveries. This does not mean the area is safe.';
        } catch (error) { status.textContent = error.message; }
        finally { refresh.disabled = false; panel.setAttribute('aria-busy','false'); }
    }
    refresh.addEventListener('click',load); await load();
}
