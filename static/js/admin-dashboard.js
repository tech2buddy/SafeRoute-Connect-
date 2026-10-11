import { supabase } from './supabase-client.js';
const status=document.getElementById('admin-status');
const content=document.getElementById('admin-content');
const refresh=document.getElementById('admin-refresh');
const node=(tag,text,className='')=> { const el=document.createElement(tag); el.textContent=text; el.className=className; return el; };
let busy=false;
function list(id,records,render) {
    const target=document.getElementById(id); target.replaceChildren();
    if(!records.length) target.append(node('p','Nothing here yet.','admin-empty'));
    for(const record of records) target.append(render(record));
}
function date(value) { return new Date(value).toLocaleString(); }
function action(row,label,operation,id) {
    const button=node('button',label,'admin-destructive'); button.type='button';
    button.addEventListener('click',async()=> {
        if(busy || !confirm(`${label}? This cannot be undone from this dashboard.`)) return;
        busy=true; button.disabled=true; refresh.disabled=true;
        try {
            const {error}=await supabase.rpc('admin_moderate',{target_id:id,operation});
            if(error) throw error;
            busy=false; await load();
        } catch(error) { status.textContent=error.message || 'Action failed.'; }
        finally { busy=false; button.disabled=false; refresh.disabled=false; }
    }); row.append(button);
}
async function load() {
    if(busy) return;
    busy=true; refresh.disabled=true; content.hidden=true; status.textContent='Loading admin data...';
    try {
        const {data:auth}=await supabase.auth.getUser();
        if(!auth.user) throw new Error('Sign in with an approved admin account to access this dashboard.');
        const {data,error}=await supabase.rpc('admin_dashboard');
        if(error) throw error;
        const totals=document.getElementById('admin-totals'); totals.replaceChildren();
        for(const [key,label] of [['users','Members'],['incidents','Community reports'],['pending','Awaiting review'],['published','Active published incidents']]) {
            const card=node('div','','admin-total'); card.append(node('strong',String(data.counts[key])),node('span',label)); totals.append(card);
        }
        list('admin-incidents',data.incidents,report=> {
            const row=node('article','','admin-record'); row.append(node('strong',report.incident_type.replaceAll('_',' ')),node('p',report.location),node('p',report.description),node('small',`${report.severity} / ${date(report.created_at)}`));
            action(row,'Delete report','delete_incident',report.id); return row;
        });
        list('admin-imports',data.imports,report=> {
            const row=node('article','','admin-record'); row.append(node('span','UNVERIFIED','admin-label'),node('strong',report.source_name));
            const extraction=report.extraction || {};
            row.append(node('p',extraction.summary || extraction.grounded_excerpts?.[0] || 'Open the source and check its relevance.'));
            try { const url=new URL(report.source_url); if(url.protocol==='https:') { const link=node('a','Read source'); link.href=url.href; link.target='_blank'; link.rel='noopener noreferrer'; row.append(link); } } catch {}
            row.append(node('small',`Found ${date(report.created_at)}`)); action(row,'Reject discovery','reject_import',report.id); return row;
        });
        list('admin-users',data.users,account=> { const row=node('article','','admin-record'); row.append(node('strong',account.display_name || 'Unnamed member'),node('small',`Joined ${date(account.created_at)}`)); return row; });
        list('admin-audit',data.audit,event=> { const row=node('article','','admin-record'); row.append(node('strong',event.action.replaceAll('_',' ')),node('small',date(event.created_at)),node('small',`Record ${event.target}`)); return row; });
        content.hidden=false; status.textContent='Admin access verified. Data updated.';
    } catch(error) { status.textContent=`Dashboard unavailable: ${error.message || 'Check your admin access.'}`; }
    finally { busy=false; refresh.disabled=false; }
}
refresh.addEventListener('click',load);
supabase.auth.onAuthStateChange((event)=> { if(event==='SIGNED_OUT') { content.hidden=true; document.querySelectorAll('.admin-record').forEach(el=>el.remove()); status.textContent='Signed out. Admin data hidden.'; } });
await load();
