export function presentationMode() {
    try { return localStorage.getItem('saferoute-workspace-mode')==='presentation'; } catch { return false; }
}
if(document.querySelector('.dashboard-topbar')) {
    const button=document.createElement('button'); button.type='button'; button.className='workspace-mode-button';
    button.textContent=presentationMode() ? 'Presentation workspace' : 'Live workspace'; button.setAttribute('aria-pressed',String(presentationMode()));
    button.title='Switch the whole website between live and presentation records';
    document.querySelector('.dashboard-userbar').prepend(button);
    button.addEventListener('click',()=> { try { localStorage.setItem('saferoute-workspace-mode',presentationMode() ? 'live' : 'presentation'); location.reload(); } catch { alert('Browser storage is unavailable. Workspace mode cannot be changed.'); } });
    if(presentationMode()) { const note=document.createElement('p'); note.className='workspace-mode-notice'; note.textContent='Presentation workspace / sample scenarios and your presentation submissions. Live records are separate.'; document.querySelector('.dashboard-main').prepend(note); }
    window.addEventListener('storage',event=> { if(event.key==='saferoute-workspace-mode')location.reload(); });
}
