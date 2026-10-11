document.getElementById('support-draft-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.getElementById('support-draft-status');
    const lines = [...new FormData(event.target)].filter(([name]) => name !== 'csrfmiddlewaretoken').map(([name,value]) => `${name.replaceAll('_',' ')}: ${value}`);
    try { await navigator.clipboard.writeText(`SafeRoute issue\n\n${lines.join('\n')}`); status.textContent = 'Copied. No message has been sent.'; }
    catch { status.textContent = 'Clipboard unavailable. Select the text in the fields to copy it manually.'; }
});
