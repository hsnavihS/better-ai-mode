import { describe, expect, it } from 'vitest';
import { CardMountRegistry } from '../entrypoints/google.content/googleAdapter';

describe('CardMountRegistry', () => {
  it('prevents duplicate cards across repeated mount attempts', () => {
    const registry = new CardMountRegistry();
    expect(registry.claim()).toBe(true);
    expect(registry.claim()).toBe(false);
    registry.release();
    expect(registry.claim()).toBe(true);
  });
});

