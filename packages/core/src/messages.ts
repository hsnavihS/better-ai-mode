import { z } from 'zod';
import { answerEventSchema } from './contracts';

export const generateRequestSchema = z.object({
  type: z.literal('answer.generate'),
  requestId: z.string().uuid(),
  query: z.string().min(1).max(500),
  pageUrl: z.url(),
  model: z.string().min(1).max(100)
});

export const cancelRequestSchema = z.object({
  type: z.literal('answer.cancel'),
  requestId: z.string().uuid()
});

export const answerEventMessageSchema = z.object({ type: z.literal('answer.event'), event: answerEventSchema });
export const settingsRequestSchema = z.object({ type: z.literal('settings.get') });
export const settingsUpdateSchema = z.object({ type: z.literal('settings.update'), autoGenerate: z.boolean().optional(), model: z.string().min(1).max(100).optional() });

export const requestMessageSchema = z.union([generateRequestSchema, cancelRequestSchema, settingsRequestSchema, settingsUpdateSchema]);
export type RequestMessage = z.infer<typeof requestMessageSchema>;

