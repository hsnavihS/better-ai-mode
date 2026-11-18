const STREAM_PORT_NAME = "better-ai-mode-search";
const CHUNK_DELAY_MS = 90;

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
