import type { AIProvider, AnswerEvent, SearchContext } from '@ai-search-companion/core';

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new DOMException('Request cancelled', 'AbortError')); return; }
  const timer = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Request cancelled', 'AbortError')); }, { once: true });
});

/** Deterministic M0 provider. It never sends data over the network. */
export class MockProvider implements AIProvider {
  readonly id = 'mock' as const;
  readonly billingMode = 'demo' as const;

  async getConnectionState() { return 'connected' as const; }
  async getModels() { return [{ id: 'demo-stream-v1', label: 'Demo streaming response' }]; }

  async *generate(input: SearchContext, model: string, signal: AbortSignal): AsyncIterable<AnswerEvent> {
    const requestId = crypto.randomUUID();
    yield { type: 'start', requestId, provider: this.id, model };
    const chunks = [
      `This is a local demo response for “${input.query}”. `,
      'It demonstrates streaming, cancellation, and the in-page card without contacting an AI provider. ',
      'Connect a supported provider in a future milestone before relying on answers for decisions.'
    ];
    try {
      for (const text of chunks) {
        await wait(90, signal);
        yield { type: 'delta', requestId, text };
      }
      yield { type: 'completed', requestId, usage: { demo: true } };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        yield { type: 'cancelled', requestId };
        return;
      }
      yield { type: 'error', requestId, code: 'mock_failure', message: 'The demo provider could not stream a response.', recoverable: true };
    }
  }
}

