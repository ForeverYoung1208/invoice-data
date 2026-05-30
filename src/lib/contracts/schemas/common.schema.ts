import { z } from 'zod';

// A single CSV row: dynamic headers → string values only
export const csvRowSchema = z.object({}).catchall(z.string());

// Array of CSV rows — the API response shape
export const csvRowsSchema = z.array(csvRowSchema);

// Inferred types
export type TCsvRow = z.infer<typeof csvRowSchema>;
export type TCsvRows = z.infer<typeof csvRowsSchema>;
