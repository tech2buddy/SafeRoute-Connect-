import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
import { readIncidentFeed } from './incident-feed.js';
if(presentationMode()) {
    const bar=document.createElement('div'); bar.className='presentation-stream-bar';
    const label=document.createElement('span'); label.textContent='Simulated incoming feed';
    const status=document.createElement('small'); status.textContent='Connecting to presentation records...'; status.setAttribute('role','status');
    const button=document.createElement('button'); button.type='button'; button.textContent='Pause simulation';
    bar.append(label,status,button); document.querySelector('.dashboard-main').prepend(bar);
    let paused=false,busy=false,canGenerate=true,complete=false,fingerprint=null,timer=null,closed=false;
    button.addEventListener('click',()=> { paused=!paused; button.textContent=paused ? 'Resume simulation' : 'Pause simulation'; if(!paused)pulse(); });
    async function pulse() {
        if(closed || busy || document.hidden)return; busy=true;
        try {
            const {data:auth}=await supabase.auth.getUser(); if(!auth.user) { status.textContent='Sign in to view the presentation feed.'; return; }
            if(!paused && canGenerate && !complete) {
                const {data,error}=await supabase.rpc('tick_presentation_stream');
                if(error) { canGenerate=false; status.textContent='Viewing mode. An admin must run the simulation; its migration must be installed.'; }
                else if(data.label)status.textContent=`Event ${data.sequence}/12: ${data.label}`;
                if(data?.complete) { complete=true; status.textContent='Scenario complete. All records remain available for review.'; button.disabled=true; }
            }
            const reports=await readIncidentFeed();
            const next=JSON.stringify(reports.filter(r=>r.feature_kind!=='support').map(r=>[r.id,r.status,r.occurred_at,r.updated_at]));
            if(next!==fingerprint)document.dispatchEvent(new Event('presentation-feed-updated'));
            fingerprint=next;
        } catch(error) { status.textContent=error.message || 'Feed unavailable. Retrying shortly.'; }
        finally { busy=false; }
    }
    timer=setInterval(pulse,15000); pulse();
    document.addEventListener('visibilitychange',()=> { if(!document.hidden)pulse(); });
    window.addEventListener('pagehide',()=> { closed=true; clearInterval(timer); });
    supabase.auth.onAuthStateChange(event=> { if(event==='SIGNED_OUT') { closed=true; clearInterval(timer); status.textContent='Signed out. Simulation stopped.'; button.disabled=true; } });
}
