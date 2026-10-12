import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
import { reportCsv } from './report-export.js';
const form=document.getElementById('admin-report-form'), status=document.getElementById('admin-report-status'),output=document.getElementById('admin-report-output');
const csv=document.getElementById('admin-report-csv'),print=document.getElementById('admin-report-print');
const node=(tag,text)=> { const el=document.createElement(tag); el.textContent=String(text ?? ''); return el; };
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
const today=`${parts.year}-${parts.month}-${parts.day}`;
form.elements.end_day.value=today; form.elements.end_day.max=today; form.elements.start_day.max=today; form.elements.start_day.value=today.slice(0,8)+'01';
let report=null,busy=false,generation=0;
function invalidate() { generation++; report=null; output.replaceChildren(); csv.disabled=print.disabled=true; }
form.addEventListener('input',invalidate);
form.addEventListener('submit',async event=> {
    event.preventDefault(); if(busy)return; invalidate(); const revision=generation; busy=true; form.querySelector('button').disabled=true; status.textContent='Generating report from the database...';
    try {
        const {data,error}=await supabase.rpc('admin_generate_report',{presentation:presentationMode(),start_day:form.elements.start_day.value,end_day:form.elements.end_day.value,report_kind:form.elements.report_kind.value}); if(error)throw error; if(revision!==generation)return;
        report=data; output.append(node('h3',`${report.workspace.toUpperCase()} / ${report.kind} report`),node('p',`${report.start_day} to ${report.end_day} / ${report.timezone} / ${report.total} records`),node('p',`Generated ${report.generated_at}. ${report.total>200 ? 'Printed preview is limited to 200 records; download CSV for the complete report.' : 'Complete report.'}`));
        const counts={}; report.rows.forEach(row=>counts[row.status]=(counts[row.status] || 0)+1);
        output.append(node('p',Object.entries(counts).map(([key,value])=>`${key.replaceAll('_',' ')}: ${value}`).join(' / ') || 'No records in this period.'));
        const table=node('table',''),head=node('tr',''); ['Category','Location / subject','Status','Date'].forEach(label=>head.append(node('th',label))); const thead=node('thead',''); thead.append(head); table.append(thead); const body=node('tbody','');
        report.rows.slice(0,200).forEach(row=> { const tr=node('tr',''); [row.category,row.location || row.subject,row.status,row.event_time || row.submitted_at].forEach(value=>tr.append(node('td',value))); body.append(tr); }); table.append(body); output.append(table);
        status.textContent=report.total>200 ? 'Preview/print shows the first 200 rows. CSV includes every row.' : 'Report ready. CSV and print include all rows.'; csv.disabled=print.disabled=false;
    } catch(error) { if(revision===generation)status.textContent=error.message || 'Unable to generate report.'; }
    finally { busy=false; form.querySelector('button').disabled=false; }
});
csv.addEventListener('click',()=> { if(!report)return; const url=URL.createObjectURL(new Blob([reportCsv(report)],{type:'text/csv;charset=utf-8'})); const link=document.createElement('a'); link.href=url; link.download=`saferoute-${report.workspace}-${report.kind}-${report.start_day}-${report.end_day}.csv`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); });
print.addEventListener('click',()=> { if(report) { document.body.classList.add('printing-admin-report'); window.print(); document.body.classList.remove('printing-admin-report'); } });
supabase.auth.onAuthStateChange(event=> { if(event==='SIGNED_OUT') { invalidate(); status.textContent='Signed out. Report cleared.'; } });
