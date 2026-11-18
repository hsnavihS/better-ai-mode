const STREAM_PORT_NAME = "better-ai-mode-search";
const CHUNK_DELAY_MS = 90;
const NATIVE_HOST = "com.better_ai_mode.auth";

function callCompanion(op) {
  return new Promise((resolve) => {
    let port;
    try { port = chrome.runtime.connectNative(NATIVE_HOST); } catch (error) { resolve({ type: "error", message: error.message }); return; }
    const requestId = crypto.randomUUID();
    const timeout = setTimeout(() => { try { port.disconnect(); } catch {} resolve({ type: "error", message: "The local companion did not respond." }); }, 10000);
    port.onMessage.addListener((message) => {
      if (message?.requestId !== requestId) return;
      clearTimeout(timeout); try { port.disconnect(); } catch {} resolve(message);
    });
    port.onDisconnect.addListener(() => {
      if (!chrome.runtime.lastError) return;
      clearTimeout(timeout); resolve({ type: "error", message: chrome.runtime.lastError.message });
    });
    port.postMessage({ op, requestId });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's popup may start or manage local authentication.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(""))) return;
  const op = message?.type === "chatgpt.status" ? "status.get" : message?.type === "chatgpt.connect" ? "auth.start" : message?.type === "chatgpt.signout" ? "auth.signOut" : null;
  if (!op) return;
  callCompanion(op).then(sendResponse);
  return true;
});

function buildMockAnswer(query) {
  return `This is a mock AI answer for "${query}". It is streamed through the Better AI Mode background service worker.`;
}

function streamMockAnswer(port, requestId, query) {
  const chunks = buildMockAnswer(query).match(/\S+\s*/g) || [];
  let index = 0;
  let timerId;
  let cancelled = false;

  const stop = () => {
    cancelled = true;
    if (timerId) clearTimeout(timerId);
  };

  port.onDisconnect.addListener(stop);
  port.onMessage.addListener((message) => {
    if (message?.type === "cancel" && message.requestId === requestId) {
      stop();
    }
  });

  const sendNext = () => {
    if (cancelled) return;

    try {
      if (index >= chunks.length) {
        port.postMessage({ type: "complete", requestId });
        return;
      }

      port.postMessage({
        type: "chunk",
        requestId,
        chunk: chunks[index]
      });
      index += 1;
      timerId = setTimeout(sendNext, CHUNK_DELAY_MS);
    } catch (error) {
      stop();
      try {
        port.postMessage({
          type: "error",
          requestId,
          message: error instanceof Error ? error.message : "Mock stream failed."
        });
      } catch {
        // The content script disconnected before the error could be delivered.
      }
    }
  };

  sendNext();
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== STREAM_PORT_NAME) return;

  let started = false;
  port.onMessage.addListener((message) => {
    if (started || message?.type !== "search") return;
    started = true;

    const query = typeof message.query === "string" ? message.query.trim() : "";
    if (!query) {
      port.postMessage({
        type: "error",
        requestId: message.requestId,
        message: "Search query is empty."
      });
      return;
    }

    streamMockAnswer(port, message.requestId, query);
  });
});
