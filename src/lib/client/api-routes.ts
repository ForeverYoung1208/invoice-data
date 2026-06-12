import z from 'zod';
import {
  taskCreatedSchema,
  taskCreateSchema,
  taskDetailSchema,
  taskListSchema,
  taskProcessedSchema,
  taskUpdateSchema,
} from '../contracts/schemas/task.schema';
import { csvRowsSchema, idSchema } from '../contracts/schemas/common.schema';

export type TApiRoute<TBody = unknown, TRes = unknown> = (
  ...params: string[]
) => {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  bodySchema?: z.ZodType<TBody>;
  responseSchema: z.ZodType<TRes>;
};

export const apiRoutes = {
  tasks: {
    list: () => ({
      url: '/api/tasks',
      method: 'GET',
      responseSchema: taskListSchema,
    }),
    create: () => ({
      url: '/api/tasks',
      method: 'POST',
      bodySchema: taskCreateSchema,
      responseSchema: taskCreatedSchema,
    }),
    detail: (id: string) => ({
      url: `/api/tasks/${id}`,
      method: 'GET',
      responseSchema: taskDetailSchema,
    }),
    delete: (id: string) => ({
      url: `/api/tasks/${id}`,
      method: 'DELETE',
      responseSchema: idSchema,
    }),
    patch: (id: string) => ({
      url: `/api/tasks/${id}`,
      method: 'PATCH',
      bodySchema: taskUpdateSchema,
      responseSchema: idSchema,
    }),
    process: (id: string) => ({
      url: `/api/tasks/${id}/process`,
      method: 'POST',
      responseSchema: taskProcessedSchema,
    }),
  },
  files: {
    rows: (taskId: string, fileId: string) => ({
      url: `/api/tasks/${taskId}/files/${fileId}`,
      method: 'GET',
      responseSchema: csvRowsSchema,
    }),
  },
} as const satisfies Record<string, Record<string, TApiRoute>>;
