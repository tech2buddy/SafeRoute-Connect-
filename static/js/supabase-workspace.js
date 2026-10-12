import { supabase } from './supabase-client.js';

const accountLink = document.querySelector('.dashboard-userbar > .app-inline-button');
const name = document.querySelector('.dashboard-user-copy');
const avatar = document.querySelector('.dashboard-avatar');
const accountLabel = document.querySelector('.dashboard-account-label');
const badge = document.querySelector('.dashboard-badge');
function updateBadge() {
    const count = Number(badge.textContent.trim());
    badge.hidden = !Number.isFinite(count) || count <= 0;
}
new MutationObserver(updateBadge).observe(badge,{childList:true,characterData:true,subtree:true});
updateBadge();
function updateAvatar() {
    const text = name.textContent.trim();
    avatar.textContent = text.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
    avatar.classList.add('has-initials');
}
new MutationObserver(updateAvatar).observe(name,{childList:true,characterData:true,subtree:true});
function showSession(session) {
    if(!session) sessionStorage.removeItem('saferoute-admin-entry');
    name.textContent = session ? (session.user.user_metadata.display_name || session.user.email) : 'Guest Explorer';
    accountLink.textContent = session ? 'Logout' : 'Login';
    accountLink.href = session ? '#logout' : '/accounts/login/';
    accountLink.classList.toggle('is-signout',Boolean(session));
    accountLabel.textContent = session ? 'YOUR ACCOUNT' : 'GUEST ACCESS';
    updateAvatar();
}
accountLink.addEventListener('click', async event => {
    if (accountLink.getAttribute('href') !== '#logout') return;
    event.preventDefault();
    const { error } = await supabase.auth.signOut();
    if (error) { alert('Logout failed. Please try again.'); return; }
    location.assign('/');
});
const { data, error } = await supabase.auth.getSession();
if (!error) showSession(data.session);
supabase.auth.onAuthStateChange((_event, session) => showSession(session));
