'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { FileText, Loader2 } from 'lucide-react';
import { ROLE_COLORS } from './constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQueries } from '@tanstack/react-query';
import { fetchTaskFileRows } from '../../../lib/client/task-detail-api';

interface FileItem {
  id: string;
  name: string;
  role: string;
  size: string;
}

interface FilesTabProps {
  files: FileItem[];
  taskId: string;
}

export function FilesTab({ files, taskId }: FilesTabProps) {
  const fileQueries = useQueries({
    queries: files.map((file) => ({
      queryKey: ['task-file', taskId, file.id],
      queryFn: () => fetchTaskFileRows(taskId, file.id),
    })),
  });
  const isAllLoading = fileQueries.some((fq) => fq.isLoading);

  return (
    <TabsContent value="files" className="mt-4 space-y-8">
      {isAllLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      )}

      {files.map((file, index) => {
        const {
          data: contents,
          error,
          isLoading,
          isError,
        } = fileQueries[index];

        return (
          <Card key={file.id} className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {file.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${ROLE_COLORS[file.role] || ''}`}>
                    {file.role}
                  </Badge>
                  <span className="text-xs text-slate-500">{file.size}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Loading...
                </div>
              ) : isError ? (
                <div className="text-center py-8 text-red-500 text-sm">
                  {error?.message || 'Unknown error'}
                </div>
              ) : contents && contents.length > 0 ? (
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        {Object.keys(contents[0]).map((header) => (
                          <TableHead
                            key={header}
                            className="text-xs text-slate-600 whitespace-nowrap"
                          >
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contents.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <TableCell
                              key={j}
                              className="text-xs text-slate-700 py-1 whitespace-nowrap"
                            >
                              {String(val)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No data available in this file.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </TabsContent>
  );
}
