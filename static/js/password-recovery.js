// Capture link context before the SDK consumes the recovery fragment.
const fragment=new URLSearchParams(location.hash.slice(1));
const query=new URLSearchParams(location.search);
const cameFromRecovery=fragment.get('type')==='recovery';
const linkError=fragment.get('error_description') || query.get('error_description');
const {supabase}=await import('./supabase-client.js');
const form=document.getElementById('password-recovery-form');
const status=document.getElementById('recovery-status');
const fields=document.getElementById('recovery-fields');
const button=form.querySelector('[type="submit"]');
let recoveryUser=null, updating=false, cooldownUntil=0;
if(fields) {
    let recoveryEvent=false;
    supabase.auth.onAuthStateChange(event=> { if(event==='PASSWORD_RECOVERY')recoveryEvent=true; if(event==='SIGNED_OUT') { recoveryUser=null; fields.disabled=true; } });
    try {
        if(linkError)throw new Error('This recovery link has expired or is invalid. Request a new link.');
        if(query.get('token_hash') && query.get('type')==='recovery') {
            const {error}=await supabase.auth.verifyOtp({token_hash:query.get('token_hash'),type:'recovery'}); if(error)throw error; recoveryEvent=true;
        }
        const {data,error}=await supabase.auth.getSession(); if(error)throw error;
        if(!data.session || (!cameFromRecovery && !recoveryEvent))throw new Error('Open this page using the password-reset link sent to your email.');
        const user=await supabase.auth.getUser(); if(user.error || !user.data.user)throw new Error('Recovery session expired. Request a new link.');
        recoveryUser=user.data.user.id; fields.disabled=false; status.textContent='Recovery link verified. Enter your new password.';
    } catch(error) { status.textContent=error.message || 'Invalid recovery link. Request a new one.'; }
    finally { history.replaceState(null,'',location.pathname); }
}
form.addEventListener('submit',async event=> {
    event.preventDefault(); if(updating || !form.reportValidity())return;
    if(Date.now()<cooldownUntil) { status.textContent='Please wait a minute before requesting another email.'; return; }
    updating=true; button.disabled=true;
    try {
        if(!fields) {
            status.textContent='Requesting a reset email...';
            const {error}=await supabase.auth.resetPasswordForEmail(form.elements.email.value.trim(),{redirectTo:`${location.origin}/accounts/reset-password/`});
            if(error)throw error;
            cooldownUntil=Date.now()+60000;
            status.textContent='If this email has an eligible account, a reset link will be sent. Check your inbox and spam folder.';
        } else {
            if(!recoveryUser)throw new Error('Use a valid password-reset email link first.');
            if(form.elements.password.value!==form.elements.confirmation.value)throw new Error('Passwords do not match.');
            const {data,error}=await supabase.auth.getUser(); if(error || data.user?.id!==recoveryUser)throw new Error('Recovery session changed. Request a new link.');
            status.textContent='Updating your password...';
            const result=await supabase.auth.updateUser({password:form.elements.password.value}); if(result.error)throw result.error;
            recoveryUser=null; form.reset(); fields.disabled=true;
            const signout=await supabase.auth.signOut();
            status.textContent=signout.error ? 'Password updated. Session sign-out failed; sign out before signing in again.' : 'Password updated. Sign in with your new password.';
            document.getElementById('recovery-retry').hidden=true;
        }
    } catch(error) { status.textContent=error.message || 'Recovery failed. Please try again.'; }
    finally { updating=false; button.disabled=Boolean(fields && !recoveryUser); }
});
