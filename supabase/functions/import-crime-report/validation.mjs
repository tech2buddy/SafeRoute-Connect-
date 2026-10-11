export function validateInput(value, allowedHosts) {
    if (!value || typeof value !== 'object') throw new Error('Invalid input');
    const url = new URL(value.source_url);
    if (url.protocol !== 'https:' || url.username || url.password || !allowedHosts.includes(url.hostname)) throw new Error('Source is not approved');
    if (url.href.length > 2000) throw new Error('Source URL too long');
    if (typeof value.source_name !== 'string' || !value.source_name.trim() || value.source_name.length > 100) throw new Error('Invalid source name');
    if (typeof value.text !== 'string' || value.text.length < 80 || value.text.length > 20000) throw new Error('Article text must contain 80-20000 characters');
    const date = Date.parse(value.published_at);
    if (!Number.isFinite(date) || date > Date.now()) throw new Error('Invalid publication timestamp');
    return { source_url:url.href, source_name:value.source_name.trim(), published_at:new Date(date).toISOString(), text:value.text };
}

export function validateExtraction(value, article) {
    if (!value || value.relevant !== true) throw new Error('No Kimberley crime incident identified');
    const types = ['shooting','robbery','assault','harassment','other'];
    if (!types.includes(value.incident_type)) throw new Error('Invalid incident type');
    for (const field of ['location_quote','incident_quote']) {
        if (typeof value[field] !== 'string' || value[field].length < 3 || value[field].length > 500 || !article.text.includes(value[field])) throw new Error('Missing source evidence');
    }
    if (typeof value.location !== 'string' || value.location.length < 3 || value.location.length > 300) throw new Error('Invalid location');
    if (typeof value.summary !== 'string' || value.summary.length < 10 || value.summary.length > 500) throw new Error('Invalid summary');
    if (value.event_date !== null) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.event_date)) throw new Error('Invalid event date');
        const date = Date.parse(value.event_date);
        if (!Number.isFinite(date) || new Date(date).toISOString().slice(0,10) !== value.event_date || date > Date.now()) throw new Error('Invalid event date');
        if (!value.date_quote || !article.text.includes(value.date_quote)) throw new Error('Event date needs source evidence');
    }
    // Explicitly discard model coordinates, identities and arbitrary extra fields.
    return { incident_type:value.incident_type, location:value.location, summary:value.summary,
        event_date:value.event_date, location_quote:value.location_quote, incident_quote:value.incident_quote,
        date_quote:value.event_date ? value.date_quote : null, verification:'unreviewed', location_precision:'unverified' };
}
