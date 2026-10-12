import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
const node=(tag,text='',className='')=> { const el=document.createElement(tag); el.textContent=text; el.className=className; return el; };
const isTicket=Boolean(document.getElementById('support-draft-form'));
if(isTicket || document.getElementById('supabase-incident-form')) {
    const section=node('section','','submission-history'); section.id=isTicket ? 'my-tickets' : 'my-reports';
    const heading=node('div','','submission-heading'),button=node('button','Refresh updates','app-inline-button'); button.type='button'; heading.append(node('h2',isTicket ? 'My support tickets' : 'My reports'),button);
    const status=node('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    const list=node('div'); section.append(heading,node('p','Your submissions and admin updates. Refresh to check for new replies.'),status,list); document.querySelector('.dashboard-main').append(section);
    let generation=0;
    async function load() {
        const revision=++generation; button.disabled=true; list.replaceChildren(); status.textContent='Loading your history...';
        try {
            const {data:auth,error:authError}=await supabase.auth.getUser(); if(authError || !auth.user)throw new Error('Sign in to view your history.');
            const {data:records,error}=await supabase.from(isTicket ? 'support_tickets' : 'incidents').select('*').eq('user_id',auth.user.id).eq('is_presentation',presentationMode()).order('created_at',{ascending:false}).limit(50); if(error)throw error;
            let updates=[];
            if(records.length) { const result=await supabase.from(isTicket ? 'support_replies' : 'incident_updates').select('*').in(isTicket ? 'ticket_id' : 'incident_id',records.map(r=>r.id)).order('created_at'); if(result.error)throw result.error; updates=result.data; }
            if(revision!==generation)return;
            for(const record of records) {
                const card=node('article','','submission-card'); const head=node('div','','submission-heading');
                head.append(node('h3',isTicket ? record.subject : record.incident_type.replaceAll('_',' ')),node('span',(record.status || 'reported').replaceAll('_',' '),'submission-status')); card.append(head,node('small',`Submitted ${new Date(record.created_at).toLocaleString()} / Reference ${record.id}`),node('p',isTicket ? record.message : `${record.location}\n${record.description}`));
                const history=updates.filter(update=>update[isTicket ? 'ticket_id' : 'incident_id']===record.id);
                if(!history.length)card.append(node('p',isTicket ? 'Waiting for an admin reply.' : 'Reported. No admin action notes yet.'));
                for(const update of history) { const entry=node('div','','submission-update'); entry.append(node('strong',isTicket ? 'Admin reply' : `Admin update / ${update.status.replaceAll('_',' ')}`),node('small',new Date(update.created_at).toLocaleString()),node('p',isTicket ? update.message : update.note)); card.append(entry); }
                list.append(card);
            }
            status.textContent=records.length ? `${records.length} submissions shown (latest 50).` : 'No submissions yet.';
        } catch(error) { if(revision===generation)status.textContent=error.message || 'Unable to load history.'; }
        finally { if(revision===generation)button.disabled=false; }
    }
    button.addEventListener('click',load); document.addEventListener('submission-saved',load);
    document.addEventListener('presentation-feed-updated',load);
    supabase.auth.onAuthStateChange(event=> { if(event==='SIGNED_OUT') { generation++; list.replaceChildren(); status.textContent='Signed out. Private history cleared.'; button.disabled=false; } });
    await load();
}
