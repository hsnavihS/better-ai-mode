const noAiToken = /(^|\s)-noai(?=\s|$)/i;

export type GoogleQuery =
  | { kind: 'ready'; query: string }
  | { kind: 'empty' }
  | { kind: 'opt-out' };

/** Reads the URL only; it deliberately does not rewrite Google searches. */
export function parseGoogleQuery(url: string): GoogleQuery {
  const query = new URL(url).searchParams.get('q')?.trim() ?? '';
  if (!query) return { kind: 'empty' };
  if (noAiToken.test(query)) return { kind: 'opt-out' };
  return { kind: 'ready', query };
}

export function isSupportedGoogleSearch(url: string): boolean {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://www.google.com' || parsed.pathname !== '/search') return false;
  const tbm = parsed.searchParams.get('tbm');
  return !tbm || tbm === 'web';
}

