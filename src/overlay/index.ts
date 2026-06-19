import '@xterm/xterm/css/xterm.css';
import { TerminalHost } from '@/terminal/host';

const host = new TerminalHost({
  container: document.getElementById('terminal')!,
  compact: true,
});

host.init().then(() => host.focus()).catch(console.error);