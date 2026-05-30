'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchTaskFileRows } from '../../../lib/client/task-detail-api';

interface JobsSourceDataViewProps {
  fileId: string;
  taskId: string;
}

export function JobsSourceDataView({
  fileId,
  taskId,
}: JobsSourceDataViewProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['task-file', taskId, fileId],
    queryFn: () => fetchTaskFileRows(taskId, fileId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-red-500 py-8">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">
          {error?.message || 'Failed to load data'}
        </span>
      </div>
    );
  }

  if (data && data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No data found in file.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            {data &&
              Object.keys(data[0]).map((header) => (
                <TableHead key={header} className="text-xs text-slate-600">
                  {header}
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data &&
            data.map((row: any, i: number) => (
              <TableRow key={i}>
                {Object.values(row).map((val: any, j: number) => (
                  <TableCell key={j} className="text-xs text-slate-700 py-1">
                    {String(val)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
