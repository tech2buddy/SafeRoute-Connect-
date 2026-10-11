export function setupIncidentComposer(form, map, hasPosition) {
    const fields = form.querySelector('.incident-fields');
    const pin = form.querySelector('.incident-pin-panel');
    const submit = form.querySelector('.incident-submit-panel');
    const status = form.querySelector('#incident-status');
    const panels = [];
    const headings = ['What did you notice?', 'Where did it happen?', 'Add the essentials.', 'Ready to share?'];
    const descriptions = ['Choose the closest match. You can change it before sending.', 'Name the place, then tap the map to confirm the position.', 'Describe what you observed, without names or identifying details.', 'Check your report. Nothing is sent until you submit.'];
    const progress = document.createElement('nav');
    progress.className = 'incident-progress'; progress.setAttribute('aria-label','Report steps');
    const title = document.createElement('h2'); title.tabIndex = -1;
    const subtitle = document.createElement('p'); subtitle.className = 'incident-stage-note';
    const stage = document.createElement('div'); stage.className = 'incident-stage-heading'; stage.append(title,subtitle);
    const top = form.closest('article').querySelector('.incident-section-head');
    top.replaceWith(progress,stage);
    for (let i=0;i<4;i++) {
        const panel = document.createElement('section'); panel.className='incident-flow-panel';
        form.insertBefore(panel,fields); panels.push(panel);
        const label = document.createElement('span'); label.textContent=`0${i+1} / ${['Notice','Location','Details','Review'][i]}`;
        progress.append(label);
    }
    const type = form.elements.namedItem('incident_type');
    const typeGroup = form.querySelector('.incident-field-incident_type');
    panels[0].append(typeGroup);
    const choices = document.createElement('div'); choices.className='incident-type-cards';
    const symbols = ['!','*','$','/','~'];
    const notes = ['Something feels out of place','A street is difficult to see','Property taken or attempted theft','Threatening or unwanted behaviour','An obstacle or unsafe road condition'];
    [...type.options].forEach((option,index) => {
        const button=document.createElement('button'); button.type='button'; button.className='incident-type-card';
        const icon=document.createElement('span'); icon.className='incident-type-symbol'; icon.textContent=symbols[index] || '!'; icon.setAttribute('aria-hidden','true');
        const name=document.createElement('strong'); name.textContent=option.text;
        const note=document.createElement('small'); note.textContent=notes[index] || 'Share a safety concern';
        button.append(icon,name,note); button.dataset.value=option.value;
        button.addEventListener('click',()=> { type.value=option.value; syncChoices(); }); choices.append(button);
    });
    function syncChoices() { for (const button of choices.children) button.setAttribute('aria-pressed',String(button.dataset.value===type.value)); }
    syncChoices(); typeGroup.hidden=true; panels[0].append(choices);
    panels[1].append(form.querySelector('.incident-field-location'),pin);
    for (const name of ['severity','occurred_at','description']) panels[2].append(form.querySelector(`.incident-field-${name}`));
    fields.remove();
    const review=document.createElement('dl'); review.className='incident-review'; panels[3].append(review,submit);
    // Keep feedback visible in every step, not inside the hidden review panel.
    form.append(status);
    const controls=document.createElement('div'); controls.className='incident-flow-controls';
    const back=document.createElement('button'); back.type='button'; back.className='app-inline-button'; back.textContent='Back';
    const next=document.createElement('button'); next.type='button'; next.className='route-find-button'; next.textContent='Continue';
    controls.append(back,next); form.append(controls);
    let current=0;
    form.noValidate=true;
    function render(focus=true) {
        panels.forEach((panel,i)=> { panel.hidden=i!==current; });
        [...progress.children].forEach((node,i)=> { node.classList.toggle('is-current',i===current); if(i===current) node.setAttribute('aria-current','step'); else node.removeAttribute('aria-current'); });
        title.textContent=headings[current]; subtitle.textContent=descriptions[current];
        back.hidden=current===0; next.hidden=current===3;
        if(current===1) requestAnimationFrame(()=>map.invalidateSize());
        if(current===3) {
            review.replaceChildren();
            for(const [label,name] of [['Incident','incident_type'],['Place','location'],['Concern level','severity'],['When','occurred_at'],['Your description','description']]) {
                const field=form.elements.namedItem(name);
                const dt=document.createElement('dt'); dt.textContent=label;
                const dd=document.createElement('dd'); dd.textContent=field.tagName==='SELECT' ? field.selectedOptions[0].text : field.value || 'Now (recorded on submission)';
                review.append(dt,dd);
            }
        }
        if(focus) title.focus({preventScroll:true});
    }
    function validate(index) {
        for(const field of panels[index].querySelectorAll('input,select,textarea')) if(!field.checkValidity()) { current=index; render(); field.reportValidity(); return false; }
        if(index===1 && !hasPosition()) { status.textContent='Tap the map to select the incident position before continuing.'; return false; }
        return true;
    }
    next.addEventListener('click',()=> { if(validate(current)) { status.textContent=''; current++; render(); } });
    back.addEventListener('click',()=> { status.textContent=''; current--; render(); });
    form.addEventListener('keydown',event=> { if(event.key==='Enter' && event.target.tagName==='INPUT') { event.preventDefault(); if(current<3) next.click(); } });
    form.addEventListener('submit',event=> {
        if(current!==3) { event.preventDefault(); event.stopImmediatePropagation(); next.click(); return; }
        for(let i=0;i<3;i++) if(!validate(i)) { event.preventDefault(); event.stopImmediatePropagation(); break; }
    },true);
    form.classList.add('incident-flow'); render(false);
}
