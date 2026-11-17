import { createRoot, type Root } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { App } from './App';
import { CardMountRegistry, findResultAnchor, getGoogleSearchState } from './googleAdapter';
import cssText from './styles.css?inline';

export default defineContentScript({
  matches: ['https://www.google.com/search*'],
  runAt: 'document_idle',
  main() {
    const registry = new CardMountRegistry();
    let host: HTMLDivElement | undefined;
    let root: Root | undefined;
    let currentUrl = '';
    let suppressedUrl: string | undefined;
    const port = chrome.runtime.connect({ name: 'ai-search-companion' });
    let settings = { autoGenerate: false, model: 'demo-stream-v1' };

    const removeCard = () => {
      root?.unmount(); root = undefined;
      host?.remove(); host = undefined;
      registry.release();
    };
    const mount = () => {
      const state = getGoogleSearchState();
      if (state.kind !== 'ready') { removeCard(); return; }
      const anchor = findResultAnchor();
      if (!anchor || !registry.claim()) return;
      host = document.createElement('div');
      host.id = 'ai-search-companion-root';
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style'); style.textContent = cssText; shadow.append(style);
      const app = document.createElement('div'); shadow.append(app);
      anchor.prepend(host);
      root = createRoot(app);
      root.render(<App query={state.query} settings={settings} port={port} onOptOut={() => { suppressedUrl = location.href; removeCard(); }} />);
    };
    const reconcile = () => {
      if (currentUrl !== location.href) suppressedUrl = undefined;
      if (suppressedUrl === location.href) return;
      if (currentUrl === location.href && host?.isConnected) return;
      currentUrl = location.href;
      removeCard();
      mount();
    };
    port.onMessage.addListener((message: unknown) => {
      const data = message as { type?: string; settings?: typeof settings };
      if (data.type === 'settings' && data.settings) { settings = data.settings; currentUrl = ''; reconcile(); }
    });
    port.postMessage({ type: 'settings.get' });
    const observer = new MutationObserver(() => { window.setTimeout(reconcile, 80); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', reconcile);
    window.addEventListener('beforeunload', () => { observer.disconnect(); removeCard(); port.disconnect(); }, { once: true });
    reconcile();
  }
});

