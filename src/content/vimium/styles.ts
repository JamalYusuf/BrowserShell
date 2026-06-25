/** Injected styles for page-mode UI (hints, HUD, seek bar). */

export const VIMIUM_STYLES = `
#bs-page-ui-root {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  overflow: visible;
}

#bs-hint-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 2147483647;
}

.bs-hint-marker {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 4px;
  background: linear-gradient(180deg, #ff6b4a 0%, #e8384f 100%);
  color: #fff;
  font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 4px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset;
  transform: translate(-2px, -2px);
  pointer-events: none;
  user-select: none;
}

.bs-hint-marker .bs-hint-typed {
  opacity: 0.55;
  text-decoration: line-through;
}

.bs-hint-marker .bs-hint-rest {
  font-weight: 800;
}

.bs-hint-marker.bs-hint-match {
  background: linear-gradient(180deg, #ffd166 0%, #f8961e 100%);
  color: #1a1a1a;
  box-shadow: 0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.5);
  transform: translate(-2px, -2px) scale(1.08);
}

.bs-hint-marker.bs-hint-active {
  background: linear-gradient(180deg, #7ee787 0%, #3fb950 100%);
  color: #0d1117;
  box-shadow: 0 0 0 3px #fff, 0 3px 12px rgba(0,0,0,0.55);
  transform: translate(-2px, -2px) scale(1.12);
}

.bs-hint-target {
  outline: 2px solid rgba(255, 107, 74, 0.85) !important;
  outline-offset: 2px !important;
  border-radius: 2px;
}

.bs-hud {
  position: fixed;
  left: 50%;
  top: 14px;
  transform: translateX(-50%);
  z-index: 2147483644;
  max-width: min(92vw, 560px);
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(12, 14, 20, 0.92);
  color: #f3f4f6;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
  animation: bs-hud-in-top 0.15s ease-out;
}

.bs-hud.bs-hud-bottom {
  top: auto;
  bottom: 18px;
  animation: bs-hud-in-bottom 0.15s ease-out;
}

.bs-hint-status {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 2147483645;
  max-width: min(94vw, 640px);
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(12, 14, 20, 0.94);
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.35;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bs-hud strong,
.bs-hint-status strong {
  color: #ff8a7a;
  font-weight: 600;
}

@keyframes bs-hud-in-top {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes bs-hud-in-bottom {
  from { opacity: 0; transform: translateX(-50%) translateY(6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.bs-seek-bar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(92vw, 520px);
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(12, 14, 20, 0.94);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: auto;
}

.bs-seek-bar label {
  color: #ff8a7a;
  font: 700 13px/1 ui-monospace, monospace;
  white-space: nowrap;
}

.bs-seek-bar input {
  flex: 1;
  border: none;
  outline: none;
  background: rgba(255,255,255,0.08);
  color: #f9fafb;
  font: 14px/1.4 ui-monospace, monospace;
  padding: 8px 10px;
  border-radius: 8px;
}

.bs-seek-bar input::placeholder { color: rgba(255,255,255,0.35); }

.bs-seek-hint {
  color: rgba(255,255,255,0.45);
  font-size: 11px;
  white-space: nowrap;
}

#bs-help-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483645;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: auto;
}

.bs-help-panel {
  max-width: min(92vw, 640px);
  max-height: min(85vh, 560px);
  overflow: auto;
  border-radius: 12px;
  background: rgba(14, 16, 22, 0.96);
  color: #e8eaed;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: auto;
}

.bs-help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 14px;
}

.bs-help-hint {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.bs-help-body {
  margin: 0;
  padding: 16px 18px 20px;
  font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: pre-wrap;
  color: #c9d1d9;
}

.bs-omnibar {
  position: fixed;
  left: 50%;
  top: 12%;
  transform: translateX(-50%);
  z-index: 2147483645;
  width: min(92vw, 680px);
  pointer-events: auto;
  border-radius: 12px;
  background: rgba(12, 14, 20, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.bs-omnibar-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.bs-omnibar-bar label {
  color: #ff8a7a;
  font: 700 14px/1 ui-monospace, monospace;
}

.bs-omnibar-bar input {
  flex: 1;
  border: none;
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  color: #f9fafb;
  font: 15px/1.4 ui-monospace, monospace;
  padding: 8px 10px;
  border-radius: 8px;
}

.bs-omnibar-results {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  max-height: 320px;
  overflow-y: auto;
}

.bs-omnibar-item {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  color: #e8eaed;
  font-size: 13px;
}

.bs-omnibar-item:hover,
.bs-omnibar-item.bs-omnibar-selected {
  background: rgba(255, 107, 74, 0.18);
}

.bs-omnibar-badge {
  color: #ff8a7a;
  font-weight: 700;
  text-align: center;
}

.bs-omnibar-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bs-omnibar-url {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.bs-omnibar-hint {
  padding: 8px 14px 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
`;

export function ensurePageUiRoot(): HTMLElement {
  let root = document.getElementById('bs-page-ui-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'bs-page-ui-root';
    document.documentElement.appendChild(root);

    const style = document.createElement('style');
    style.id = 'bs-page-ui-styles';
    style.textContent = VIMIUM_STYLES;
    document.documentElement.appendChild(style);
  }
  return root;
}