export function csvCell(value) {
    let text=String(value ?? '');
    // Prevent untrusted text becoming a spreadsheet formula, including whitespace prefixes.
    if(/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
    return `"${text.replaceAll('"','""')}"`;
}
export function reportCsv(report) {
    const columns=report.kind==='incidents' ? ['id','category','location','severity','status','event_time','submitted_at','updated_at'] : ['id','category','subject','status','submitted_at','updated_at'];
    return '\ufeff'+[
        ['Workspace',report.workspace,'Period',report.start_day,report.end_day,'Timezone',report.timezone].map(csvCell).join(','),
        columns.map(csvCell).join(','),...report.rows.map(row=>columns.map(key=>csvCell(row[key])).join(','))
    ].join('\r\n');
}
