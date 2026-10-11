import { supabase } from './supabase-client.js';

const form = document.querySelector('[data-supabase-auth]');
if (form) {
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-auth-status]');
    button.disabled = false;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        button.disabled = true;
        status.textContent = 'Connecting securely...';
        try {
            const fields = new FormData(form);
            const email = fields.get('email').trim();
            if (form.dataset.supabaseAuth === 'signup') {
                if (fields.get('password1') !== fields.get('password2')) throw new Error('Passwords do not match.');
                const { data, error } = await supabase.auth.signUp({
                    email, password: fields.get('password1'),
                    options: {
                        data: { display_name: fields.get('username').trim() },
                        emailRedirectTo: `${location.origin}/accounts/login/`,
                    },
                });
                if (error) throw error;
                form.reset();
                if (data.session) location.assign('/routes/');
                else status.textContent = 'Check your email for a confirmation link before signing in.';
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password: fields.get('password') });
                if (error) throw error;
                location.assign('/routes/');
            }
        } catch (error) {
            status.textContent = error.message || 'Unable to connect. Please try again.';
        } finally {
            button.disabled = false;
        }
    });
}
