import { z } from 'zod';

export const providerIds = ['mock', 'openai-api', 'gemini-api', 'anthropic-api', 'chatgpt-plan'] as const;
export type ProviderId = (typeof providerIds)[number];

export type BillingMode = 'demo' | 'api-key' | 'chatgpt-plan';

export type SearchContext = {
  query: string;
  searchEngine: 'google';
  pageUrl: string;
};

export type AnswerEvent =
  | { type: 'start'; requestId: string; provider: ProviderId; model: string }
  | { type: 'delta'; requestId: string; text: string }
  | { type: 'citation'; requestId: string; title: string; url: string; snippet?: string }
  | { type: 'completed'; requestId: string; usage?: Record<string, unknown> }
  | { type: 'cancelled'; requestId: string }
  | { type: 'error'; requestId: string; code: string; message: string; recoverable: boolean };

export interface AIProvider {
  readonly id: ProviderId;
  readonly billingMode: BillingMode;
  getConnectionState(): Promise<'connected' | 'disconnected' | 'unavailable'>;
  getModels(): Promise<{ id: string; label: string }[]>;
  generate(input: SearchContext, model: string, signal: AbortSignal): AsyncIterable<AnswerEvent>;
}

export const answerEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), requestId: z.string().min(1), provider: z.enum(providerIds), model: z.string().min(1) }),
  z.object({ type: z.literal('delta'), requestId: z.string().min(1), text: z.string() }),
  z.object({ type: z.literal('citation'), requestId: z.string().min(1), title: z.string(), url: z.url(), snippet: z.string().optional() }),
  z.object({ type: z.literal('completed'), requestId: z.string().min(1), usage: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal('cancelled'), requestId: z.string().min(1) }),
  z.object({ type: z.literal('error'), requestId: z.string().min(1), code: z.string(), message: z.string(), recoverable: z.boolean() })
]);

