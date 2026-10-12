import { supabase } from './supabase-client.js';
import { presentationMode } from './workspace-mode.js';
const form=document.getElementById('support-draft-form');
form.elements.subject.maxLength=200;
form.elements.message.maxLength=5000;
form.addEventListener('submit',async event=> {
    event.preventDefault(); const button=form.querySelector('[type="submit"]'); const status=document.getElementById('support-draft-status');
    button.disabled=true; status.textContent='Sending your ticket...';
    try {
        const {data,error:authError}=await supabase.auth.getUser();
        if(authError || !data.user) throw new Error('Please sign in before sending a support ticket.');
        const {data:id,error}=await supabase.rpc('submit_support_ticket_mode',{ticket_category:form.elements.category.value,ticket_subject:form.elements.subject.value.trim(),ticket_message:form.elements.message.value.trim(),presentation:presentationMode()});
        if(error) throw error;
        form.reset(); status.textContent=`Ticket sent to the admin queue. Reference: ${id}. No email notification has been sent.`;
        document.dispatchEvent(new Event('submission-saved'));
    } catch(error) { status.textContent=error.message || 'Unable to send. Please try again.'; }
    finally { button.disabled=false; }
});
