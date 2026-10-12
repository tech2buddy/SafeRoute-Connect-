import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
const form = document.getElementById('account-form');
const planner = document.getElementById('id_safety_priority');
const status = document.getElementById('account-status');
const button = form?.querySelector('[type="submit"]');
const profile = Boolean(form?.elements.display_name);
let user;
let edited = false;
function updateProfileIdentity(name) {
    const heading = document.getElementById('profile-name');
    if (!heading) return;
    heading.textContent = name || 'SafeRoute member';
    document.getElementById('profile-initials').textContent = (name || 'SafeRoute member').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
}
async function loadProfileActivity(account) {
    const date = new Date(account.created_at);
    document.getElementById('profile-member-since').textContent = Number.isNaN(date.getTime()) ? 'SafeRoute member' : `Member since ${date.toLocaleDateString(undefined,{month:'long',year:'numeric'})}`;
    const results = await Promise.allSettled([
        supabase.from('saved_routes').select('id',{count:'exact',head:true}).eq('user_id',account.id).eq('is_presentation',presentationMode()),
        supabase.from('incidents').select('id',{count:'exact',head:true}).eq('user_id',account.id).eq('is_presentation',presentationMode()),
    ]);
    results.forEach((result,index)=> {
        const node=document.getElementById(index===0 ? 'profile-route-count' : 'profile-report-count');
        if(result.status==='fulfilled' && !result.value.error) node.textContent=result.value.count ?? 0;
        else { node.textContent='--'; node.title='Activity count unavailable. Try refreshing.'; }
    });
}
planner?.addEventListener('change', () => { edited = true; });
if (form || planner) {
    try {
        const { data,error } = await supabase.auth.getUser();
        if (error || !data.user) throw new Error('Sign in to manage your account.');
        user = data.user;
        const table = profile ? 'profiles' : 'preferences';
        const { data:record,error:readError } = await supabase.from(table).select('*').eq(profile ? 'id' : 'user_id',user.id).maybeSingle();
        if (readError) throw readError;
        if (profile) {
            form.elements.display_name.value = record?.display_name || user.user_metadata.display_name || '';
            document.getElementById('account-email').textContent = user.email;
            for (const key of ['gender','home_province','home_area']) if(form.elements[key]) form.elements[key].value=record?.[key] ?? user.user_metadata[key] ?? (key==='gender' ? 'prefer_not_to_say' : '');
            updateProfileIdentity(form.elements.display_name.value);
            if (document.getElementById('profile-name')) loadProfileActivity(user).catch(()=>{});
        } else if (form && record) {
            form.elements.route_preference.value = record.route_preference;
            form.elements.alert_radius.value = record.alert_radius;
        }
        if (planner && record && !edited) {
            planner.value = record.route_preference;
            planner.dispatchEvent(new Event('change',{ bubbles:true }));
        }
        if (button) button.disabled = false;
        if (status) status.textContent = '';
    } catch (error) { if (status) status.textContent = error.message; }
}
form?.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; status.textContent = 'Saving...';
    try {
        const { data,error:authError } = await supabase.auth.getUser();
        if (authError || data.user?.id !== user.id) throw new Error('Session changed. Reload and sign in again.');
        const record = profile ? { id:user.id,display_name:form.elements.display_name.value.trim() }
            : { user_id:user.id,route_preference:form.elements.route_preference.value,alert_radius:Number(form.elements.alert_radius.value) };
        if (profile && !record.display_name) throw new Error('Enter a display name.');
        if(profile) for(const key of ['gender','home_province','home_area'])record[key]=form.elements[key].value.trim();
        const { error } = await supabase.from(profile ? 'profiles' : 'preferences').upsert(record);
        if (error) throw error;
        if (profile) {
            const { error:syncError } = await supabase.auth.updateUser({ data:{ display_name:record.display_name,gender:record.gender,home_province:record.home_province,home_area:record.home_area } });
            if (syncError) throw new Error('Profile saved; navigation name synchronization failed. Please retry.');
            const navigationName = document.querySelector('.dashboard-user-copy');
            if (navigationName) navigationName.textContent = record.display_name;
            updateProfileIdentity(record.display_name);
        }
        status.textContent = 'Saved to your account.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
});
