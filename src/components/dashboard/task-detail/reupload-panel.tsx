'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Loader2 } from 'lucide-react';
import { ETaskFileRole } from '@/lib/constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/client/useApi';
import { apiRoutes } from '@/lib/client/api-routes';

const ROLES: ETaskFileRole[] = [
  ETaskFileRole.JOBS,
  ETaskFileRole.CLIENTS,
  ETaskFileRole.PARTS,
  ETaskFileRole.DEVICES,
];

interface ReuploadPanelProps {
  taskId: string;
  disabled?: boolean;
  /** Called after a successful replacement so the caller can re-queue */
  onReplaced: () => void;
}

export function ReuploadPanel({
  taskId,
  disabled = false,
  onReplaced,
}: ReuploadPanelProps) {
  const [selectedRole, setSelectedRole] = useState<ETaskFileRole>(
    ETaskFileRole.JOBS,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const replaceMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('role', selectedRole);
      formData.append('file', file);
      return useApi(apiRoutes.tasks.replaceFile, {
        params: [taskId],
        body: formData,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      // Invalidate cached file rows for all files of this task
      await queryClient.invalidateQueries({
        queryKey: ['task-file', taskId],
      });
      onReplaced();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    replaceMutation.mutate(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const isPending = replaceMutation.isPending;

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
          <UploadCloud className="w-4 h-4" /> Replace Input File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Replace one of the input CSVs and re-run the agent from scratch.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as ETaskFileRole)}
            disabled={disabled || isPending}
            className="border border-slate-300 rounded-md text-sm px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            disabled={disabled || isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            {isPending ? 'Uploading…' : 'Choose File'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {replaceMutation.isError && (
          <p className="text-xs text-red-600">
            {replaceMutation.error?.message ?? 'Upload failed'}
          </p>
        )}
        {replaceMutation.isSuccess && (
          <p className="text-xs text-green-600">
            File replaced — task re-queued for processing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
