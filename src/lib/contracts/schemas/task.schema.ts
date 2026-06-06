import z from 'zod';
import { ETaskFileRole, ETaskStatus } from '../../constants';

/**
 ******************
 * API->UI
 ******************
 */

export const taskFileSchema = z.object({
  id: z.string(),
  role: z.enum(ETaskFileRole),
  originalName: z.string(),
  filePath: z.string(),
  createdAt: z.string(),
});

export const resultJsonSchema = z.looseObject({}); // Type: { [key: string]: unknown } TODO: make strict when tune up langGraph

export const taskCorrectionSchema = z.object({
  id: z.string(),
  message: z.string(),
  createdAt: z.string(),
  resultSnapshotBefore: resultJsonSchema.nullable(),
});

export const taskResultSchema = z.object({
  id: z.string(),
  resultJson: resultJsonSchema,
  zipPath: z.string().nullable(),
  createdAt: z.string(),
});

export const taskDetailSchema = z.object({
  id: z.string(),
  status: z.enum(ETaskStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
  instructions: z.string().nullable(),
  files: z.array(taskFileSchema),
  results: z.array(taskResultSchema),
  corrections: z.array(taskCorrectionSchema),
  errorMessage: z.string().nullable(),
});

export const taskCreatedSchema = z.object({
  id: z.string(),
  status: z.enum(ETaskStatus),
  instructions: z.string().nullable(),
  filesCount: z.number(),
});

export const taskListItemSchema = z.object({
  id: z.string(),
  status: z.enum(ETaskStatus),
  createdAt: z.string(),
  filesCount: z.number(),
});

export const taskListSchema = z.array(taskListItemSchema);

export type TTaskFileDto = z.infer<typeof taskFileSchema>;
export type TTaskCorrectionDto = z.infer<typeof taskCorrectionSchema>;
export type TTaskResultDto = z.infer<typeof taskResultSchema>;
export type TTaskDetailDto = z.infer<typeof taskDetailSchema>;
export type TResultJsonDto = z.infer<typeof resultJsonSchema>;
export type TTaskListItemDto = z.infer<typeof taskListItemSchema>;

/**
 ******************
 * UI->API
 ******************
 */

export const taskCreateSchema = taskDetailSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  corrections: true,
  errorMessage: true,
});

export const taskUpdateSchema = taskDetailSchema
  .omit({ corrections: true })
  .partial()
  .extend({
    correction: z.string().optional(),
  });

export type TTaskCreateDto = z.infer<typeof taskCreateSchema>;
export type TTaskUpdateDto = z.infer<typeof taskUpdateSchema>;
