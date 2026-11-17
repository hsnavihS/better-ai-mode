import { useEffect, useRef, useState } from 'react';
import type { AnswerEvent } from '@ai-search-companion/core';
import type { Settings } from '../../src/storage/settings';

type Props = { query: string; settings: Settings; port: chrome.runtime.Port; onOptOut: () => void };
type Phase = 'idle' | 'loading' | 'done' | 'error';

export function App({ query, settings, port, onOptOut }: Props) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('Demo provider only — no query leaves your browser in M0.');
  const requestId = useRef<string | null>(null);

  const cancel = () => {
    if (requestId.current) port.postMessage({ type: 'answer.cancel', requestId: requestId.current });
    requestId.current = null;
    setPhase('idle');
  };
  const generate = () => {
    cancel();
    const id = crypto.randomUUID();
    requestId.current = id;
    setText(''); setPhase('loading'); setMessage('Streaming a deterministic demo response…');
    port.postMessage({ type: 'answer.generate', requestId: id, query, pageUrl: location.href, model: settings.model });
  };
  useEffect(() => {
    const handler = (raw: unknown) => {
      const value = raw as { type?: string; clientRequestId?: string; event?: AnswerEvent };
      if (value.type !== 'answer.event' || value.clientRequestId !== requestId.current || !value.event) return;
      const event = value.event;
      if (event.type === 'delta') setText((current) => current + event.text);
      if (event.type === 'completed') { setPhase('done'); setMessage('Demo complete — this is not a real AI answer.'); }
      if (event.type === 'cancelled') { setPhase('idle'); setMessage('Generation stopped.'); }
      if (event.type === 'error') { setPhase('error'); setMessage(event.message); }
    };
    port.onMessage.addListener(handler);
    return () => { port.onMessage.removeListener(handler); cancel(); };
  }, [port]);
  useEffect(() => { if (settings.autoGenerate) generate(); }, [query]);

  const copy = async () => { await navigator.clipboard.writeText(text); setMessage('Copied demo text.'); };
  return <section className="asc-card" aria-label="AI Search Companion answer">
    <header><div><strong>AI answer</strong><span className="asc-badge">Demo</span></div><small>Third-party output by AI Search Companion</small></header>
    <p className="asc-disclosure">Provider: Demo streaming response · never a Google result</p>
    {text ? <p className="asc-answer">{text}</p> : <p className="asc-status" aria-live="polite">{message}</p>}
    <footer>
      {phase === 'loading' ? <button onClick={cancel}>Stop</button> : <button onClick={generate}>{phase === 'done' ? 'Regenerate' : 'Generate AI answer'}</button>}
      <button onClick={copy} disabled={!text}>Copy</button>
      <button onClick={() => setMessage('Sources are unavailable for the deterministic demo provider.')} disabled={phase === 'loading'}>Sources</button>
      <button className="asc-text-button" onClick={onOptOut}>Hide for this search</button>
    </footer>
  </section>;
}

