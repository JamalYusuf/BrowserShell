import '@xterm/xterm/css/xterm.css';
import { TerminalHost } from '@/terminal/host';

const host = new TerminalHost({ container: document.getElementById('terminal')! });
host.init().catch((err) => console.error('BrowserShell init failed:', err));