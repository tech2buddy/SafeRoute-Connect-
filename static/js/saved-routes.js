import { supabase } from './supabase-client.js';

const path = location.pathname;
const relevant = ['/routes/', '/routes/history/', '/routes/find/'].includes(path);
const form = document.getElementById('route-form');
function element(tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text; node.className = className;
    return node;
}
async function currentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Sign in to save and view your routes.');
    return data.user;
}
if (form) {
    const button = form.querySelector('[type="submit"]') || document.getElementById('save-planned-route');
    const status = document.getElementById('route-save-status');
    button.disabled = false;
    form.addEventListener('submit', async event => {
        event.preventDefault(); button.disabled = true;
        status.textContent = 'Saving route search...';
        try {
            const user = await currentUser();
            const fields = new FormData(form);
            const { error } = await supabase.from('saved_routes').insert({
                user_id:user.id,
                start_location:fields.get('start_location').trim(),
                destination:fields.get('destination').trim(),
                travel_mode:fields.get('travel_mode'), preference:fields.get('safety_priority'),
            });
            if (error) throw error;
            status.textContent = 'Route search saved to your account.';
            await loadRoutes();
        } catch (error) { status.textContent = error.message || 'Unable to save route.'; }
        finally { button.disabled = false; }
    });
}
function routeCard(route, editable) {
    const row = element('article','','saved-route-card');
    const copy = element('div','','recent-route-copy');
    copy.append(element('strong', `${route.start_location} → ${route.destination}`),
        element('small', `${new Date(route.created_at).toLocaleString()} · ${route.travel_mode} · ${route.preference} preference`));
    row.append(copy);
    if (editable) {
        const actions = element('div','','app-action-row');
        const favorite = element('button', route.is_favorite ? 'Remove favorite' : 'Favorite','app-inline-button');
        const remove = element('button','Delete','app-inline-button');
        favorite.type = remove.type = 'button';
        favorite.setAttribute('aria-pressed', String(route.is_favorite));
        const status = element('p',''); status.setAttribute('role','status');
        async function change(operation) {
            favorite.disabled = remove.disabled = true;
            try {
                const user = await currentUser();
                const query = operation === 'delete'
                    ? supabase.from('saved_routes').delete()
                    : supabase.from('saved_routes').update({ is_favorite:!route.is_favorite });
                const { data, error } = await query.eq('id', route.id).eq('user_id', user.id).select('id');
                if (error) throw error;
                if (!data.length) throw new Error('This route is no longer available. Refresh the page.');
                await loadRoutes();
            } catch (error) { status.textContent = error.message; }
            finally { favorite.disabled = remove.disabled = false; }
        }
        favorite.addEventListener('click', () => change('favorite'));
        remove.addEventListener('click', () => {
            if (confirm('Delete this saved route search? This cannot be undone.')) change('delete');
        });
        if (path === '/routes/history/') actions.append(favorite);
        if (path === '/routes/find/') {
            const plan = element('button','Plan again','app-inline-button'); plan.type = 'button';
            plan.addEventListener('click', () => document.dispatchEvent(new CustomEvent('reuse-route-search',{detail:route})));
            actions.append(plan);
        }
        actions.append(remove); row.append(actions,status);
    }
    return row;
}
async function loadRoutes() {
    const list = document.querySelector('.recent-route-list');
    const favorites = path === '/routes/history/' ? document.querySelector('.app-simple-list') : null;
    const count = path === '/routes/' ? document.querySelector('.dashboard-stat-value') : null;
    if (!list) return;
    list.replaceChildren(element('p','Loading saved routes...'));
    if (favorites) favorites.replaceChildren();
    if (count) count.textContent = '--';
    try {
        const user = await currentUser();
        const { data, error } = await supabase.from('saved_routes').select('*')
            .eq('user_id',user.id).order('created_at',{ ascending:false });
        if (error) throw error;
        list.replaceChildren();
        const visible = path === '/routes/history/' ? data : data.slice(0,4);
        visible.forEach(route => list.append(routeCard(route,path === '/routes/history/' || path === '/routes/find/')));
        if (!data.length) list.append(element('p','No saved routes yet. Plan a journey and save your search.'));
        if (count) {
            count.textContent = data.length;
            const label = document.querySelector('.dashboard-stat-copy span');
            if (label) label.textContent = 'Saved Routes';
        }
        if (favorites) {
            const selected = data.filter(route => route.is_favorite);
            selected.forEach(route => favorites.append(routeCard(route,true)));
            if (!selected.length) favorites.append(element('p','Favorite a route from your history to see it here.'));
        }
    } catch (error) {
        list.replaceChildren(element('p',error.message || 'Unable to load routes.'));
        if (favorites) favorites.append(element('p','Favorites are unavailable until your routes load.'));
        const retry = element('button','Retry','app-inline-button'); retry.type='button';
        retry.addEventListener('click',loadRoutes); list.append(retry);
    }
}
if (relevant) await loadRoutes();
