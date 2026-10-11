import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
Deno.serve(async request => {
    const origin = request.headers.get('Origin') || '';
    const allowed = (Deno.env.get('WEBSITE_ORIGINS') || 'http://127.0.0.1:8001,http://localhost:8001,https://safe-route-connect.vercel.app').split(',').map(s => s.trim());
    const headers = {'Content-Type':'application/json','Cache-Control':'no-store',
        'Access-Control-Allow-Origin':allowed.includes(origin) ? origin : 'https://safe-route-connect.vercel.app',
        'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type',
        'Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'};
    const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return json({error:'POST required'},405);
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({error:'Server not configured'},503);
    const db = createClient(url,key,{auth:{persistSession:false}});
    const {data:auth,error:authError} = await db.auth.getUser(token);
    if (authError || !auth.user) return json({error:'Sign in to view discoveries'},401);
    const {data,error} = await db.from('incident_imports').select('id,source_url,source_name,extraction,created_at')
        .eq('status','pending_review').eq('extraction->>kind','search_candidate')
        .gte('created_at',new Date(Date.now()-7*86400000).toISOString()).order('created_at',{ascending:false}).limit(12);
    if (error) return json({error:'Discovery feed unavailable'},503);
    return json({reports:data.map(row => ({id:row.id,source_url:row.source_url,source_name:row.source_name,discovered_at:row.created_at,
        excerpts:Array.isArray(row.extraction.grounded_excerpts) ? row.extraction.grounded_excerpts.filter((value:unknown) => typeof value === 'string').slice(0,3) : [],
        search_entry_point:row.extraction.search_entry_point?.renderedContent || null,
    }))});
});
