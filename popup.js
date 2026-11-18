const status = document.getElementById('status');
const button = document.getElementById('connect');

async function refresh() {
  const result = await chrome.runtime.sendMessage({ type: 'chatgpt.status' });
  if (result?.state === 'connected') {
    status.textContent = `Connected as ${result.account?.email || 'your ChatGPT account'}.`;
    button.textContent = 'Disconnect ChatGPT';
    button.onclick = async () => { await chrome.runtime.sendMessage({ type: 'chatgpt.signout' }); await refresh(); };
  } else if (result?.state === 'disconnected') {
    status.textContent = 'Use your ChatGPT plan through the local companion.';
    button.textContent = 'Continue with ChatGPT';
    button.onclick = async () => { const reply = await chrome.runtime.sendMessage({ type: 'chatgpt.connect' }); status.textContent = reply?.message || 'Browser sign-in started. Complete it, then reopen this popup.'; };
  } else {
    status.className = 'error'; status.textContent = result?.message || 'Install the local companion to connect ChatGPT.';
  }
}
refresh().catch(() => { status.className = 'error'; status.textContent = 'The extension service worker is unavailable.'; });
