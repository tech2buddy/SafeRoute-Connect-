import { supabase } from './supabase-client.js';

export async function lookupPlace(input) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to search places, or enter coordinates manually.');
    const response = await fetch('https://lpbmswrvezvtrwhbsewt.supabase.co/functions/v1/location-search', {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify(input),signal:AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Location search failed.');
    return result.point;
}
