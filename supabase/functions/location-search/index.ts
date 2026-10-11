import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const requests = new Map<string, {at:number; count:number}>();
Deno.serve(async request => {
    const origin = request.headers.get('Origin') || '';
    const allowed = (Deno.env.get('WEBSITE_ORIGINS') || 'http://127.0.0.1:8001,http://localhost:8001,https://safe-route-connect.vercel.app').split(',').map(s => s.trim());
    const headers = {'Content-Type':'application/json','Cache-Control':'no-store',
        'Access-Control-Allow-Origin':allowed.includes(origin) ? origin : allowed[0],
        'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type',
        'Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'};
    const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return json({error:'POST required'},405);
    if (origin && !allowed.includes(origin)) return json({error:'Origin not allowed'},403);
    const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
    const {data,error} = await db.auth.getUser(token);
    if (error || !data.user) return json({error:'Sign in to search places'},401);
    // Best-effort per-instance limit; configure provider quotas for a global billing cap.
    const now = Date.now();
    for (const [id,entry] of requests) if (now-entry.at > 60000) requests.delete(id);
    const entry = requests.get(data.user.id) || {at:now,count:0};
    if (++entry.count > 20) return json({error:'Too many searches. Try again in a minute.'},429);
    requests.set(data.user.id,entry);
    const key = Deno.env.get('GEOAPIFY_API_KEY');
    if (!key) return json({error:'Place search is not configured'},503);
    try {
        const text = await request.text();
        if (text.length > 2000) return json({error:'Request too large'},413);
        const input = JSON.parse(text);
        const reverse = input.action === 'reverse';
        if (!reverse && input.action !== 'search') return json({error:'Invalid action'},400);
        const url = new URL(`https://api.geoapify.com/v1/geocode/${reverse ? 'reverse' : 'search'}`);
        url.searchParams.set('apiKey',key);
        url.searchParams.set('format','json');
        url.searchParams.set('lang','en');
        url.searchParams.set('limit','1');
        if (reverse) {
            if (typeof input.lat !== 'number' || typeof input.lng !== 'number' || !Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat)>90 || Math.abs(input.lng)>180) return json({error:'Invalid coordinates'},400);
            url.searchParams.set('lat',String(input.lat));
            url.searchParams.set('lon',String(input.lng));
        } else {
            if (typeof input.query !== 'string' || input.query.trim().length<2 || input.query.length>300) return json({error:'Enter a place or street address'},400);
            url.searchParams.set('text',input.query.trim());
            url.searchParams.set('filter','countrycode:za');
            url.searchParams.set('bias','proximity:24.762,-28.746');
        }
        const response = await fetch(url,{signal:AbortSignal.timeout(10000)});
        if (!response.ok) return json({error:'Address provider unavailable. Please try again.'},502);
        const result = (await response.json()).results?.[0];
        if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lon)) return json({error:'No location found. Try a street number and street name in Kimberley.'},404);
        const street = result.street ? [result.housenumber,result.street].filter(Boolean).join(' ') : '';
        const label = reverse ? (street || result.name ? `Near ${[result.name,street,result.suburb,result.city].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}` : 'Your current GPS position') : result.formatted;
        return json({point:{lat:result.lat,lng:result.lon,label},provider:'Geoapify'});
    } catch {
        return json({error:'Address lookup failed. Please try again.'},400);
    }
});
