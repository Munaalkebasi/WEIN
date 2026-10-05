import { z } from 'zod';

const text = z.string().trim().min(1).max(500).optional();
const date = z.string().datetime({ offset: true }).optional();

export const discoverySearchSchema = z.object({
  prompt: text,
  query: text,
  city: text,
  region: text,
  country: z.string().length(2).optional(),
  timezone: text,
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  radiusKm: z.number().finite().positive().max(1000).optional(),
  startDate: date,
  endDate: date,
  category: text,
  minPrice: z.number().finite().nonnegative().optional(),
  maxPrice: z.number().finite().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  freeOnly: z.boolean().optional(),
  age: z.number().int().min(0).max(120).optional(),
  sort: z.enum(['relevance', 'date', 'distance']).optional(),
  limit: z.number().int().min(1).max(20).optional(),
}).superRefine((params, ctx) => {
  if ((params.latitude === undefined) !== (params.longitude === undefined)) {
    ctx.addIssue({ code: 'custom', message: 'Provide both latitude and longitude.' });
  }
  if (params.startDate && params.endDate && Date.parse(params.startDate) > Date.parse(params.endDate)) {
    ctx.addIssue({ code: 'custom', message: 'End date must follow start date.' });
  }
  if (params.minPrice !== undefined && params.maxPrice !== undefined && params.minPrice > params.maxPrice) {
    ctx.addIssue({ code: 'custom', message: 'Maximum price must be at least the minimum price.' });
  }
});
