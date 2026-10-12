export function localDateTime(now=new Date()) {
    const pad=value=>String(value).padStart(2,'0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
export function validIncidentTime(value,now=new Date()) {
    if(!value)return true;
    const time=new Date(value).getTime();
    return Number.isFinite(time) && time<=now.getTime();
}
export function setupIncidentDate(field) {
    function update() {
        field.max=localDateTime();
        field.setCustomValidity(validIncidentTime(field.value) ? '' : 'Choose a valid incident time in the past or today, not the future.');
    }
    field.addEventListener('focus',update); field.addEventListener('input',update);
    update(); return update;
}
