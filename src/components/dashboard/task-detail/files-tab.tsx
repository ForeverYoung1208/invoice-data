'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { FileText, Table as TableIcon, Loader2 } from 'lucide-react';
import { ROLE_COLORS } from './constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FileItem {
  id: string;
  name: string;
  role: string;
  size: string;
}

interface FilesTabProps {
  files: FileItem[];
}

export function FilesTab({ files }: FilesTabProps) {
  const [contents, setContents] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchAllContents = async () => {
      if (files.length === 0) return;
      setLoading(true);
      const newContents: Record<string, any[]> = {};
      const newErrors: Record<string, string | null> = {};

      await Promise.all(
        files.map(async (file) => {
          try {
            const res = await fetch(`/api/files/${file.id}`);
            if (!res.ok) throw new Error('Failed to fetch content');
            const data = await res.json();

            const parsed = parseCSV(data.content);
            newContents[file.id] = parsed;
          } catch (err) {
            newErrors[file.id] =
              err instanceof Error ? err.message : 'Failed to load content';
          }
        }),
      );

      setContents(newContents);
      setErrors(newErrors);
      setLoading(false);
    };

    void fetchAllContents();
  }, [files]);

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          // Handle escaped quotes ""
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);

    return lines
      .slice(1)
      .map((line) => {
        if (!line.trim()) return null;
        const values = parseLine(line);
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] !== undefined ? values[i] : '';
        });
        return obj;
      })
      .filter(Boolean);
  };

  const selectedFileId = files.length > 0 ? files[0].id : null; // Not actually used anymore, showing all

  return (
    <TabsContent value="files" className="mt-4 space-y-8">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      )}

      {!loading &&
        files.map((file) => (
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
              {errors[file.id] ? (
                <div className="text-center py-8 text-red-500 text-sm">
                  {errors[file.id]}
                </div>
              ) : contents[file.id] && contents[file.id].length > 0 ? (
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        {Object.keys(contents[file.id][0]).map((header) => (
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
                      {contents[file.id].map((row, i) => (
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
        ))}
    </TabsContent>
  );
}
