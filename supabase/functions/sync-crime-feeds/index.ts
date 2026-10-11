import { XMLParser } from 'npm:fast-xml-parser@4.5.3';

const json = (body:unknown, status=200) => new Response(JSON.stringify(body), { status, headers:{ 'Content-Type':'application/json' } });
Deno.serve(async request => {
    const token = Deno.env.get('IMPORTER_TOKEN');
    if (!token || request.headers.get('Authorization') !== `Bearer ${token}`) return json({ error:'Unauthorized' },401);
    if (request.method !== 'POST') return json({ error:'POST required' },405);
    const allowed = (Deno.env.get('IMPORT_SOURCE_HOSTS') || '').split(',').map(s => s.trim());
    let feeds: { url:string; name:string }[];
    try {
        feeds = JSON.parse(Deno.env.get('CRIME_FEEDS_JSON') || '[]');
        if (!Array.isArray(feeds) || feeds.length > 3) throw new Error();
        for (const feed of feeds) {
            const url = new URL(feed.url);
            if (url.protocol !== 'https:' || url.username || url.password || !allowed.includes(url.hostname) || !feed.name) throw new Error();
        }
    } catch { return json({ error:'Invalid permitted feed configuration' },503); }
    if (!feeds.length) return json({ error:'No permitted RSS feeds configured' },503);
    const results: { source:string; status:string; imported?:number }[] = [];
    for (const feed of feeds) {
        try {
            const response = await fetch(feed.url, { redirect:'error', signal:AbortSignal.timeout(10000), headers:{ Accept:'application/rss+xml, application/xml' } });
            if (!response.ok || !response.body) throw new Error();
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let xml = '', size = 0;
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.length;
                if (size > 500000) { await reader.cancel(); throw new Error(); }
                xml += decoder.decode(value, { stream:true });
            }
            xml += decoder.decode();
            if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error();
            const parsed = new XMLParser({ ignoreAttributes:false, processEntities:false }).parse(xml);
            const items = parsed.rss?.channel?.item || [];
            const list = Array.isArray(items) ? items : [items];
            let imported = 0;
            // Bound API cost and runtime: only the three latest recent Kimberley entries.
            for (const item of list.slice(0,3)) {
                const text = `${item.title || ''}\n${item.description || ''}`.replace(/<[^>]*>/g,' ').trim();
                const date = Date.parse(item.pubDate);
                if (!/kimberley/i.test(text) || text.length < 80 || !Number.isFinite(date) || date > Date.now() || Date.now()-date > 7*86400000) continue;
                const result = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/import-crime-report`, {
                    method:'POST', signal:AbortSignal.timeout(40000),
                    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
                    body:JSON.stringify({ source_url:item.link, source_name:feed.name, published_at:new Date(date).toISOString(), text:text.slice(0,20000) }),
                });
                if (result.status === 201) imported++;
                else if (!result.ok && result.status !== 422) throw new Error();
            }
            results.push({ source:feed.name, status:'checked', imported });
        } catch { results.push({ source:feed.name, status:'failed' }); }
    }
    return json({ results }, results.some(result => result.status === 'failed') ? 502 : 200);
});
