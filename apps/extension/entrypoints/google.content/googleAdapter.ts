import { isSupportedGoogleSearch, parseGoogleQuery, type GoogleQuery } from '@ai-search-companion/core';

export function getGoogleSearchState(url = location.href): GoogleQuery {
  return isSupportedGoogleSearch(url) ? parseGoogleQuery(url) : { kind: 'empty' };
}

/** Keeps exactly one host per content-script lifetime. */
export class CardMountRegistry {
  private mounted = false;
  claim(): boolean { if (this.mounted) return false; this.mounted = true; return true; }
  release(): void { this.mounted = false; }
}

export function findResultAnchor(): Element | null {
  return document.querySelector('#search') ?? document.querySelector('#rso') ?? document.querySelector('main');
}

