import '@xterm/xterm/css/xterm.css';
import { TerminalHost } from '@/terminal/host';

let hostTabId: number | undefined;

window.addEventListener('message', (e) => {
  if (e.data?.type === 'browsershell-host-tab' && typeof e.data.tabId === 'number') {
    hostTabId = e.data.tabId;
  }
});

// Request host tab from content script (overlay iframe has no direct tab context)
if (window.parent !== window) {
  window.parent.postMessage({ type: 'browsershell-request-host-tab' }, '*');
}

const host = new TerminalHost({
  container: document.getElementById('terminal')!,
  compact: true,
  getHostTabId: () => hostTabId,
});

host.init().then(() => host.focus()).catch(console.error);