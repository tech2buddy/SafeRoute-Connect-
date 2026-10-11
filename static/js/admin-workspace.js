import { supabase } from './supabase-client.js';
const $ = id => document.getElementById(id);
const element = (tag,text='',className='') => { const el=document.createElement(tag); el.textContent=String(text ?? ''); el.className=className; return el; };
const descriptions={imports:'Unverified discoveries awaiting a relevance check. Select one to inspect the source.',incidents:'Community submissions. Select a report to review details or remove it.',users:'Profile records only, not all authentication accounts. Member permissions are managed in Supabase.',audit:'Recorded moderation decisions. Entries are read-only.'};
const title=(record,tab)=>tab==='imports' ? record.source_name : tab==='incidents' ? record.incident_type?.replaceAll('_',' ') : tab==='users' ? record.display_name || 'Unnamed member' : record.action?.replaceAll('_',' ');
const summary=(record,tab)=>tab==='imports' ? record.extraction?.summary || record.extraction?.grounded_excerpts?.[0] || 'No summary available. Inspect the source.' : tab==='incidents' ? record.location : tab==='users' ? `Profile ${record.id}` : `Record ${record.target}`;
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
descriptions.tickets='Private support requests. Select a ticket to read it and update its status.';
const ticketTab=element('button','Support tickets '); ticketTab.type='button'; ticketTab.id='tab-tickets'; ticketTab.dataset.tab='tickets'; ticketTab.setAttribute('role','tab'); ticketTab.setAttribute('aria-controls','admin-queue-panel'); ticketTab.append(element('span')); document.querySelector('.admin-tabs').append(ticketTab);
const tabs=[...document.querySelectorAll('[data-tab]')];
let data=null, current='imports', selected=null, busy=false, generation=0;
let overviewVisible=true;
function updateView() {
    $('admin-overview').hidden=!overviewVisible;
    document.querySelector('.admin-desk').hidden=overviewVisible;
    const link=$('admin-overview-link'); link.classList.toggle('is-active',overviewVisible);
    if(overviewVisible)link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    document.querySelectorAll('.admin-side-nav').forEach(button=> { const active=!overviewVisible && button.dataset.section===current; button.classList.toggle('is-active',active); if(active)button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
}
$('admin-overview-link').addEventListener('click',event=> { event.preventDefault(); if(!data)return; overviewVisible=true; updateView(); closeSidebar(); $('admin-overview').scrollIntoView({block:'start'}); });
document.querySelectorAll('[data-overview-section]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.overviewSection)));
function closeSidebar() {
    $('workspace-navigation').classList.remove('mobile-menu-open');
    const toggle=document.querySelector('.workspace-menu-toggle'); toggle.setAttribute('aria-expanded','false'); toggle.querySelector('span').textContent='+';
}
function rows() { return data?.[current] || []; }
function recordTitle(record) { return current==='tickets' ? record.subject : title(record,current); }
function recordSummary(record) { return current==='tickets' ? `${record.category} / ${record.display_name || 'Member'} / ${record.status.replaceAll('_',' ')}` : summary(record,current); }
function filtered() { const query=$('admin-search').value.trim().toLowerCase(); return rows().filter(record=>[recordTitle(record),recordSummary(record),record.description,record.message,record.id,record.target].join(' ').toLowerCase().includes(query)); }
function field(target,label,value) { const block=element('div','','admin-detail-field'); block.append(element('span',label),element('p',value || 'Not supplied')); target.append(block); }
function renderDetail(record) {
    const detail=$('admin-detail'); detail.replaceChildren();
    if(!record) { detail.append(element('span','RECORD INSPECTOR','admin-eyebrow'),element('div','+','admin-inspector-symbol'),element('h3','A closer look.'),element('p','Select a record from the queue to inspect its details and available actions.')); return; }
    detail.append(element('span',current==='imports' ? 'UNVERIFIED DISCOVERY' : 'RECORD INSPECTOR','admin-eyebrow'),element('h3',recordTitle(record)));
    field(detail,'Recorded',date(record.created_at));
    if(current==='imports') {
        const extraction=record.extraction || {};
        field(detail,'Search evidence',extraction.summary || (extraction.grounded_excerpts || []).filter(v=>typeof v==='string').join('\n\n'));
        field(detail,'Location','Not confirmed'); field(detail,'Event date','Not confirmed');
        try { const url=new URL(record.source_url); if(url.protocol==='https:') { const link=element('a','Open original source','admin-source-link'); link.href=url.href; link.target='_blank'; link.rel='noopener noreferrer'; detail.append(link); } } catch {}
        detail.append(element('p','A search result is not confirmation that an incident happened. Reject irrelevant or unreliable material.','admin-detail-warning'));
        addAction(detail,'Reject discovery','reject_import',record.id);
    } else if(current==='incidents') {
        field(detail,'Location',record.location); field(detail,'Concern level',{safe:'Low concern',moderate:'Use caution',risky:'High risk'}[record.severity]); field(detail,'Description',record.description);
        detail.append(element('p','Deleting removes this community report. Map markers disappear when viewers refresh.','admin-detail-warning'));
        addAction(detail,'Delete report','delete_incident',record.id);
    } else if(current==='tickets') {
        field(detail,'From',record.display_name || 'Member'); field(detail,'User ID',record.user_id); field(detail,'Category',record.category); field(detail,'Message',record.message); field(detail,'Updated',date(record.updated_at));
        const label=element('label','Ticket status','admin-ticket-status'); const select=element('select');
        for(const value of ['open','in_progress','resolved']) { const option=element('option',value.replaceAll('_',' ')); option.value=value; select.append(option); }
        select.value=record.status; label.append(select); detail.append(label);
        const button=element('button','Update status','app-inline-button'); button.type='button'; detail.append(button);
        button.addEventListener('click',async()=> {
            if(busy)return; busy=true; button.disabled=true; $('admin-refresh').disabled=true; const revision=generation;
            try { const {error}=await supabase.rpc('admin_update_ticket',{ticket_id:record.id,new_status:select.value}); if(error)throw error; if(revision!==generation)return; busy=false; await load(); }
            catch(error) { if(revision===generation)$('admin-status').textContent=error.message || 'Could not update ticket.'; }
            finally { busy=false; button.disabled=false; $('admin-refresh').disabled=false; }
        });
    } else if(current==='users') { field(detail,'Profile ID',record.id); detail.append(element('p','Read-only directory. No user account or permission changes are available here.','admin-detail-warning')); }
    else { field(detail,'Target record',record.target); detail.append(element('p','This audit entry records a moderation action. It cannot be edited here.','admin-detail-warning')); }
}
function addAction(target,label,operation,id) {
    const button=element('button',label,'admin-danger-button'); button.type='button'; button.disabled=busy;
    button.addEventListener('click',async()=> {
        if(busy || !confirm(`${label}? This action cannot be undone here.`)) return;
        busy=true; button.disabled=true; $('admin-refresh').disabled=true;
        const revision=generation;
        try { const {error}=await supabase.rpc('admin_moderate',{target_id:id,operation}); if(error) throw error; if(revision!==generation)return; selected=null; busy=false; await load(); }
        catch(error) { if(revision===generation) $('admin-status').textContent=error.message || 'Action failed. Please retry.'; }
        finally { busy=false; button.disabled=false; $('admin-refresh').disabled=false; }
    }); target.append(button);
}
function render() {
    const records=filtered(); const container=$('admin-records'); container.replaceChildren();
    $('admin-section-note').textContent=descriptions[current]; $('admin-result-count').textContent=`${records.length} of ${rows().length}`;
    tabs.forEach(tab=> { const active=tab.dataset.tab===current; tab.setAttribute('aria-selected',String(active)); tab.tabIndex=active ? 0 : -1; tab.querySelector('span').textContent=data?.[tab.dataset.tab]?.length ?? 0; });
    $('admin-queue-panel').setAttribute('aria-labelledby',`tab-${current}`);
    document.querySelectorAll('.admin-side-nav').forEach(button=> { const active=button.dataset.section===current; button.classList.toggle('is-active',active); if(active)button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
    if(!records.length) { const empty=element('div','','admin-empty'); empty.append(element('strong',$('admin-search').value ? 'No matching records.' : 'All clear here.'),element('p',$('admin-search').value ? 'Try another keyword or clear the search.' : 'There are no loaded records in this section.')); container.append(empty); }
    records.forEach((record,index)=> {
        const key=current==='audit' ? `${record.target}/${record.created_at}/${index}` : record.id;
        const button=element('button','','admin-queue-row'); button.type='button'; button.setAttribute('aria-pressed',String(selected===key));
        const symbol=element('span',current==='imports' ? '?' : current==='incidents' ? '!' : current==='users' ? (record.display_name || 'M')[0].toUpperCase() : '/','admin-row-symbol');
        const copy=element('span','','admin-row-copy'); copy.append(element('strong',recordTitle(record)),element('span',recordSummary(record)),element('small',date(record.created_at)));
        const badge=element('span',current==='imports' ? 'Needs review' : current==='incidents' ? ({safe:'Low concern',moderate:'Caution',risky:'High risk'}[record.severity] || 'Report') : 'View','admin-row-badge');
        button.append(symbol,copy,badge); button.addEventListener('click',()=> { selected=key; render(); renderDetail(record); }); container.append(button);
        if(current==='tickets') badge.textContent=record.status.replaceAll('_',' ');
    });
    if(!selected) renderDetail(null);
}
async function load() {
    if(busy)return; const revision=++generation; busy=true; $('admin-refresh').disabled=true;
    $('admin-status').textContent='Checking access and loading records...';
    try {
        const {data:auth,error:authError}=await supabase.auth.getUser(); if(authError || !auth.user)throw new Error('Sign in with an approved admin account.');
        const response=await supabase.rpc('admin_dashboard'); if(response.error)throw response.error; if(revision!==generation)return;
        const ticketResponse=await supabase.rpc('admin_support_tickets');
        if(revision!==generation)return;
        data=response.data; data.tickets=ticketResponse.data || []; selected=null;
        if(ticketResponse.error) descriptions.tickets='Support queue unavailable. Apply the support-ticket migration, then refresh.';
        else descriptions.tickets='Private support requests. Select a ticket to read it and update its status.';
        $('overview-pending').textContent=`${data.counts.pending} discoveries awaiting review`;
        $('overview-incidents').textContent=`${data.counts.incidents} community reports`;
        $('overview-tickets').textContent=ticketResponse.error ? 'Support queue unavailable' : `${data.tickets.filter(ticket=>ticket.status!=='resolved').length} unresolved loaded tickets`;
        const totals=$('admin-totals'); totals.replaceChildren();
        for(const [key,label,note,tab] of [['pending','Awaiting review','AI discovery queue','imports'],['incidents','Community reports','Submitted by members','incidents'],['users','Member profiles','Profile records, not auth accounts','users'],['published','Published incidents','Active reviewed imports',null]]) {
            const card=element(tab ? 'button' : 'div','','admin-total'); if(tab) { card.type='button'; card.addEventListener('click',()=>switchTab(tab)); }
            card.append(element('span',label,'admin-total-label'),element('strong',data.counts[key]),element('small',note)); totals.append(card);
        }
        contentVisible(true); render(); updateView(); $('admin-status').textContent='Admin access verified'; $('admin-updated').textContent=`Updated ${new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`;
    } catch(error) { if(revision===generation) { data=null; contentVisible(false); $('admin-status').textContent=`Dashboard unavailable: ${error.message || 'Check admin access.'}`; } }
    finally { if(revision===generation) { busy=false; $('admin-refresh').disabled=false; } }
}
function contentVisible(value) { $('admin-content').hidden=!value; }
function switchTab(tab) { if(!data)return; overviewVisible=false; current=tab; selected=null; $('admin-search').value=''; render(); updateView(); }
document.querySelectorAll('.admin-side-nav').forEach(button=>button.addEventListener('click',()=> {
    switchTab(button.dataset.section);
    document.querySelector('.admin-desk').scrollIntoView({block:'start'});
    const navigation=$('workspace-navigation'); navigation.classList.remove('mobile-menu-open');
    const toggle=document.querySelector('.workspace-menu-toggle'); toggle.setAttribute('aria-expanded','false'); toggle.querySelector('span').textContent='+';
}));
tabs.forEach((tab,index)=> { tab.addEventListener('click',()=>switchTab(tab.dataset.tab)); tab.addEventListener('keydown',event=> { const offsets={ArrowRight:1,ArrowLeft:-1,Home:-index,End:tabs.length-1-index}; if(!(event.key in offsets))return; event.preventDefault(); const next=tabs[(index+offsets[event.key]+tabs.length)%tabs.length]; switchTab(next.dataset.tab); next.focus(); }); });
$('admin-search').addEventListener('input',()=> { selected=null; render(); }); $('admin-refresh').addEventListener('click',load);
supabase.auth.onAuthStateChange(event=> { if(event==='SIGNED_OUT') { generation++; busy=false; data=null; selected=null; contentVisible(false); $('admin-records').replaceChildren(); $('admin-detail').replaceChildren(); $('admin-totals').replaceChildren(); $('admin-status').textContent='Signed out. Admin data cleared.'; } });
await load();
