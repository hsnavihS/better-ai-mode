import { MockProvider } from './mock';

/** M0 intentionally exposes only the non-network demo provider. */
export const providerRouter = { mock: new MockProvider() } as const;

