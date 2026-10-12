import { supabase } from './supabase-client.js';

const form = document.getElementById('admin-login-form');
const status = document.getElementById('admin-login-status');

// Prefill email if already signed in on the client
try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.email && !form.elements.email.value) {
        form.elements.email.value = authData.user.email;
    }
} catch {}

form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    status.style.color = '#15964e';
    status.textContent = 'Checking admin credentials...';

    try {
        const email = form.elements.email.value.trim();
        const password = form.elements.password.value;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const role = await supabase.from('admin_members').select('user_id').eq('user_id', data.user.id).maybeSingle();
        if (role.error || !role.data) {
            await supabase.auth.signOut({ scope: 'local' });
            throw new Error('This account is not an approved administrator.');
        }

        // Gate access to the admin workspace; backend RPCs independently enforce admin membership.
        sessionStorage.setItem('saferoute-admin-entry', JSON.stringify({ user: data.user.id, at: Date.now() }));
        form.elements.password.value = '';
        status.textContent = 'Access granted. Opening workspace...';
        location.replace('/manage/');
    } catch (error) {
        status.style.color = '#dc2626';
        status.textContent = error.message || 'Admin sign-in failed.';
    } finally {
        button.disabled = false;
    }
});
