import { describe, expect, it } from 'vitest';
import { MockProvider } from '../src/providers/mock';

describe('MockProvider', () => {
  it('emits a typed start, streamed text, and terminal completion', async () => {
    const provider = new MockProvider();
    const events = [];
    for await (const event of provider.generate({ query: 'test query', searchEngine: 'google', pageUrl: 'https://www.google.com/search?q=test' }, 'demo-stream-v1', new AbortController().signal)) events.push(event);
    expect(events.map((event) => event.type)).toEqual(['start', 'delta', 'delta', 'delta', 'completed']);
    expect(events.filter((event) => event.type === 'delta').map((event) => event.text).join('')).toContain('test query');
  });

  it('emits cancelled rather than completed after cancellation', async () => {
    const provider = new MockProvider();
    const controller = new AbortController();
    const iterator = provider.generate({ query: 'test', searchEngine: 'google', pageUrl: 'https://www.google.com/search?q=test' }, 'demo-stream-v1', controller.signal)[Symbol.asyncIterator]();
    expect((await iterator.next()).value.type).toBe('start');
    controller.abort();
    expect((await iterator.next()).value.type).toBe('cancelled');
  });
});

