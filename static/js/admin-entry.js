import { supabase } from './supabase-client.js';
export async function requireAdminEntry() {
    const {data,error}=await supabase.auth.getUser();
    let entry;
    try { entry=JSON.parse(sessionStorage.getItem('saferoute-admin-entry')); } catch {}
    if(error || !data.user || entry?.user!==data.user.id || !Number.isFinite(entry?.at) || Date.now()-entry.at>1800000 || entry.at>Date.now()) {
        location.replace('/accounts/admin-login/'); return false;
    }
    return true;
}
