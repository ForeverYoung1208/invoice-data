import { csvRowsSchema } from '../contracts/schemas/common.schema';
import {
  taskDetailSchema,
  TTaskDetailDto,
} from '../contracts/schemas/task.schema';

export type CsvRow = Record<string, string>;

export async function fetchTaskDetail(taskId: string): Promise<TTaskDetailDto> {
  const res = await fetch(`/api/tasks/${taskId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch task detail: ${res.statusText}`);
  }

  return taskDetailSchema.parse(await res.json());
}

export async function fetchTaskFileRows(
  taskId: string,
  fileId: string,
): Promise<CsvRow[]> {
  const res = await fetch(`/api/tasks/${taskId}/files/${fileId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch task file rows: ${res.statusText}`);
  }

  return csvRowsSchema.parse(await res.json());
}
