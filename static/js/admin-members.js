import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
export function renderMemberEditor(target,member,{onSaved,onError}) {
    const form=document.createElement('form'); form.className='admin-response-form';
    const label=document.createElement('label'); label.textContent='Display name'; const name=document.createElement('input'); name.value=member.display_name || ''; name.required=true; name.maxLength=100; label.append(name);
    const roleLabel=document.createElement('label'); roleLabel.textContent=presentationMode() ? 'Presentation role (simulated)' : 'Live access role'; const role=document.createElement('select');
    for(const [value,text] of [['member','Member'],['admin','Administrator']]) { const option=document.createElement('option'); option.value=value; option.textContent=text; role.append(option); }
    role.value=member.is_admin ? 'admin' : 'member'; if(member.is_self && !presentationMode())role.disabled=true;
    roleLabel.append(role); const warning=document.createElement('p'); warning.className='admin-detail-warning'; warning.textContent=presentationMode() ? 'Presentation edits do not change real account permissions or the live profile.' : 'Administrator access allows viewing private records and changing reports. Your own role cannot be revoked here.';
    const button=document.createElement('button'); button.type='submit'; button.className='app-inline-button'; button.textContent='Save member'; form.append(label,roleLabel,warning,button); target.append(form);
    let busy=false;
    form.addEventListener('submit',async event=> {
        event.preventDefault(); if(busy)return; const adminRole=role.value==='admin';
        if(!presentationMode() && adminRole!==member.is_admin && !confirm(`Change ${member.email}'s LIVE role to ${role.value}? This changes access to private admin data.`))return;
        busy=true; button.disabled=true;
        try { const {error}=await supabase.rpc('admin_update_member',{target_id:member.id,member_name:name.value.trim(),admin_role:adminRole,presentation:presentationMode()}); if(error)throw error; await onSaved(); }
        catch(error) { onError(error.message || 'Unable to update member.'); }
        finally { busy=false; button.disabled=false; }
    });
}
