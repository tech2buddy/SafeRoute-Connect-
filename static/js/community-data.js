import { supabase } from './supabase-client.js';
import { readIncidentFeed, appendProvenance } from './incident-feed.js';

const path = location.pathname;
const dashboard = path === '/routes/';
const community = path === '/community/';
const alerts = path === '/alerts/';
const labels = { safe:'Low concern', moderate:'Use caution', risky:'High risk' };
function node(tag, text, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
}
function makeReport(report, compact = false) {
    const title = report.incident_type.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());
    const row = node('article', '', compact ? 'report-item' : 'app-feed-card');
    const heading = node('div', '', compact ? 'report-copy' : 'app-feed-head');
    const copy = node('div', '');
    copy.append(node('strong', title), node('small', `${report.location} · ${new Date(report.occurred_at).toLocaleString()}`));
    const badge = node('span', labels[report.severity], `route-risk-tag ${report.severity}`);
    if (compact) {
        const icon = node('span', '!', `report-icon report-${report.severity}`);
        icon.setAttribute('aria-hidden','true');
        heading.append(copy);
        row.append(icon, heading, badge);
    } else {
        heading.append(copy, badge);
        row.append(heading, node('p', report.description));
        const link = node('a','View incident map'); link.href = '/map/';
        row.append(link);
    }
    appendProvenance(copy, report);
    return row;
}
const bell = document.querySelector('.dashboard-badge');
if (bell) bell.textContent = '--';
if (dashboard || community || alerts) {
    const list = document.querySelector(dashboard ? '.recent-reports-card .report-list' : community ? '.app-feed-list' : '.app-alert-list');
    const stats = dashboard ? [...document.querySelectorAll('.dashboard-stats .dashboard-stat-value')] : [...document.querySelectorAll('.app-alert-stat-grid .dashboard-stat-copy strong')];
    const reportStats = dashboard ? stats.slice(1) : stats;
    reportStats.forEach(element => { element.textContent = '--'; });
    if (dashboard) {
        const labels = document.querySelectorAll('.dashboard-stats .dashboard-stat-copy span');
        if (labels[2]) labels[2].textContent = 'Community Reports';
        if (labels[3]) labels[3].textContent = 'Risk Reports';
    }
    const status = node('p','Loading saved community reports...');
    status.setAttribute('role','status');
    list.replaceChildren(status);
    async function refresh() {
        try {
            const { data:user, error:authError } = await supabase.auth.getUser();
            if (authError || !user.user) throw new Error('Sign in to view community reports.');
            const reports = await readIncidentFeed();
            const counts = { safe:0, moderate:0, risky:0 };
            reports.forEach(report => { counts[report.severity]++; });
            if (dashboard) {
                [reports.length, reports.length, counts.moderate + counts.risky].forEach((value,index) => { reportStats[index].textContent = value; });
            } else if (alerts) {
                [counts.safe,counts.moderate,counts.risky].forEach((value,index) => { stats[index].textContent = value; });
            }
            if (bell) bell.textContent = counts.moderate + counts.risky;
            list.replaceChildren();
            const visible = dashboard ? reports.slice(0,3) : reports;
            visible.forEach(report => list.append(makeReport(report, dashboard)));
            if (!visible.length) list.append(node('p','No incidents reported yet.'));
        } catch (error) {
            reportStats.forEach(element => { element.textContent = '--'; });
            list.replaceChildren(node('p', error.message || 'Unable to load reports.'));
            const retry = node('button','Retry','app-inline-button');
            retry.type = 'button';
            retry.addEventListener('click', () => { retry.disabled = true; refresh(); });
            list.append(retry);
        }
    }
    await refresh();
}
