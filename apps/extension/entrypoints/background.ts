import { requestMessageSchema } from '@ai-search-companion/core';
import { defineBackground } from 'wxt/utils/define-background';
import { providerRouter } from '../src/providers/router';
import { getSettings, updateSettings } from '../src/storage/settings';

export default defineBackground(() => {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'ai-search-companion') return;
    const senderUrl = port.sender?.url;
    if (!senderUrl || !senderUrl.startsWith('https://www.google.com/search')) {
      port.disconnect();
      return;
    }
    const active = new Map<string, AbortController>();
    port.onMessage.addListener(async (raw: unknown) => {
      const parsed = requestMessageSchema.safeParse(raw);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === 'settings.get') {
        port.postMessage({ type: 'settings', settings: await getSettings() });
        return;
      }
      if (message.type === 'settings.update') {
        port.postMessage({ type: 'settings', settings: await updateSettings(message) });
        return;
      }
      if (message.type === 'answer.cancel') {
        active.get(message.requestId)?.abort();
        active.delete(message.requestId);
        return;
      }
      const controller = new AbortController();
      active.set(message.requestId, controller);
      try {
        for await (const event of providerRouter.mock.generate({ query: message.query, searchEngine: 'google', pageUrl: message.pageUrl }, message.model, controller.signal)) {
          port.postMessage({ type: 'answer.event', clientRequestId: message.requestId, event });
        }
      } finally {
        active.delete(message.requestId);
      }
    });
    port.onDisconnect.addListener(() => {
      for (const controller of active.values()) controller.abort();
      active.clear();
    });
  });
});

