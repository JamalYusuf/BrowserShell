import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';

function postToHost(type: 'browsershell-show' | 'browsershell-close' | 'browsershell-toggle'): void {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage({ type }, '*');
  }
}

export const overlay = defineCommand({
  name: 'overlay',
  description: 'Control the Quake-style terminal overlay size and visibility.',
  usage: 'overlay <half|full|show|hide|toggle|status> | overlay height <percent>',
  examples: ['overlay half', 'overlay full', 'overlay toggle', 'overlay show', 'overlay status', 'overlay height 60'],
  category: 'utility',
  seeAlso: ['config', 'quick'],
  notes: 'Height changes apply immediately when the overlay is open. show/hide/toggle work from inside the shell.',
  handler: async (args, _ctx) => {
    const parts = filterFlags(args);
    const sub = parts[0];

    if (sub === 'show') {
      postToHost('browsershell-show');
      return { stdout: success('Overlay shown.'), exitCode: 0 };
    }

    if (sub === 'hide') {
      postToHost('browsershell-close');
      return { stdout: success('Overlay hidden.'), exitCode: 0 };
    }

    if (sub === 'toggle') {
      postToHost('browsershell-toggle');
      return { stdout: success('Overlay toggled.'), exitCode: 0 };
    }

    if (sub === 'status') {
      const cfg = await loadConfig();
      const height = cfg.overlayHeight;
      const label = height >= 95 ? 'full' : height <= 55 ? 'half' : `${height}%`;
      return {
        stdout: [
          `overlay: ${cfg.overlayEnabled ? 'enabled' : 'disabled'}`,
          `height: ${height}% (${label})`,
          `opacity: ${cfg.overlayOpacity}`,
          `toggle: ${cfg.toggleKey}`,
        ].join('\n'),
        exitCode: 0,
      };
    }

    if (sub === 'half') {
      await saveConfig({ overlayHeight: 50, overlayEnabled: true });
      return { stdout: success('Overlay set to half height (50%).'), exitCode: 0 };
    }

    if (sub === 'full') {
      await saveConfig({ overlayHeight: 100, overlayEnabled: true });
      return { stdout: success('Overlay set to full height (100%).'), exitCode: 0 };
    }

    if (sub === 'height') {
      const value = Number(parts[1]);
      if (!Number.isFinite(value) || value < 20 || value > 100) {
        return { stderr: error('Usage: overlay height <20-100>'), exitCode: 2 };
      }
      await saveConfig({ overlayHeight: Math.round(value), overlayEnabled: true });
      return { stdout: success(`Overlay height set to ${Math.round(value)}%.`), exitCode: 0 };
    }

    return { stderr: error('Usage: overlay <half|full|show|hide|toggle|status> | overlay height <percent>'), exitCode: 2 };
  },
});