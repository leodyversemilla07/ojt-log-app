import { z } from 'zod';

export const createLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  weekNumber: z.number().int().min(1).max(52),
  dayNumber: z.number().int().min(1).max(7),
  timeIn: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  timeOut: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  tasksAccomplished: z.array(z.string()).default([]),
  keyLearnings: z.array(z.string()).default([]),
  challenges: z.string().optional().default(''),
  goalsForTomorrow: z.string().optional().default(''),
});

export const updateLogSchema = createLogSchema;

export type CreateLogInput = z.infer<typeof createLogSchema>;
export type UpdateLogInput = z.infer<typeof updateLogSchema>;
