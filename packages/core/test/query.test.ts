import { describe, expect, it } from 'vitest';
import { isSupportedGoogleSearch, parseGoogleQuery } from '../src/query';

describe('parseGoogleQuery', () => {
  it('reads encoded Unicode from the q URL parameter', () => {
    expect(parseGoogleQuery('https://www.google.com/search?q=caf%C3%A9+%E6%9D%B1%E4%BA%AC')).toEqual({ kind: 'ready', query: 'café 東京' });
  });

  it('suppresses a standalone -noai token without changing the browser URL', () => {
    expect(parseGoogleQuery('https://www.google.com/search?q=capital+-noai')).toEqual({ kind: 'opt-out' });
    expect(parseGoogleQuery('https://www.google.com/search?q=about-noai')).toEqual({ kind: 'ready', query: 'about-noai' });
  });

  it('handles an absent or empty q parameter', () => {
    expect(parseGoogleQuery('https://www.google.com/search')).toEqual({ kind: 'empty' });
    expect(parseGoogleQuery('https://www.google.com/search?q=%20')).toEqual({ kind: 'empty' });
  });
});

describe('isSupportedGoogleSearch', () => {
  it('excludes image and Maps verticals', () => {
    expect(isSupportedGoogleSearch('https://www.google.com/search?q=birds')).toBe(true);
    expect(isSupportedGoogleSearch('https://www.google.com/search?q=birds&tbm=isch')).toBe(false);
    expect(isSupportedGoogleSearch('https://www.google.com/maps?q=birds')).toBe(false);
  });
});
