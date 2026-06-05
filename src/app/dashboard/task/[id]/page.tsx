'use client';

/**
 * Task Detail / Review
 *
 * Route: /dashboard/task/[id]
 * Purpose: View extraction results, correct them, and approve or re-run.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ChevronLeft, Loader2 } from 'lucide-react';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { TaskHeader } from '@/components/dashboard/task-detail/task-header';
import { JobsSourceDataView } from '@/components/dashboard/task-detail/jobs-source-data-view';
import { InvoicesTable } from '@/components/dashboard/task-detail/invoices-table';
import { CorrectionForm } from '@/components/dashboard/task-detail/correction-form';
import { FilesTab } from '@/components/dashboard/task-detail/files-tab';
import { CorrectionsTab } from '@/components/dashboard/task-detail/corrections-tab';
import { InstructionsTab } from '@/components/dashboard/task-detail/instructions-tab';
import { TaskFooter } from '@/components/dashboard/task-detail/task-footer';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTaskDetail } from '@/lib/client/task-detail-api';
import dayjs from 'dayjs';
import { TTaskUpdateDto } from '@/lib/contracts/schemas/task.schema';
import { DATE_TIME_FORMAT, ETaskFileRole, ETaskStatus } from '@/lib/constants';

export default function TaskDetailPage({
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ id: string }>;
}) {
  // Handle async params using React.use() as per Next.js 16.2.4 requirements
  const { id: taskId } = use(params);

  const router = useRouter();
  const [correctionText, setCorrectionText] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTaskDetail(taskId),
  });

  const task = data
    ? {
        id: data.id,
        status: data.status,
        createdAt: dayjs(data.createdAt).format(DATE_TIME_FORMAT),
        updatedAt: dayjs(data.updatedAt).format(DATE_TIME_FORMAT),
      }
    : null;

  const files =
    data?.files.map((f) => ({
      id: f.id,
      name: f.originalName,
      role: f.role,
      size: `${(f.filePath || '').split('/').pop() || '—'}`,
    })) || [];

  const corrections =
    data?.corrections.map((c) => ({
      id: c.id,
      message: c.message,
      createdAt: dayjs(c.createdAt).format(DATE_TIME_FORMAT),
    })) || [];

  const latestResult =
    data?.results && data.results.length > 0 ? data.results[0] : null;

  const result: any = latestResult?.resultJson ?? null;

  const taskPatchMutation = useMutation({
    mutationFn: async (body: TTaskUpdateDto) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to submit correction');
    },
    onSuccess: async () => {
      setCorrectionText('');
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleSubmitCorrection = () => {
    const correction = correctionText.trim();
    taskPatchMutation.mutate({ correction });
  };

  const handleApprove = () => {
    taskPatchMutation.mutate({ status: ETaskStatus.COMPLETED });
  };

  const handleReRun = () => {
    taskPatchMutation.mutate({ status: ETaskStatus.QUEUED });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      router.push('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md max-w-md text-center">
          <h2 className="font-semibold mb-2">
            Error: {error?.message || 'Unknown error'}
          </h2>
          <p className="text-sm">{error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-lg mb-2">Task not found</p>
          <Link href="/dashboard">
            <Button>Back to Tasks</Button>
          </Link>
        </div>
      </div>
    );
  }

  const jobsFile = files.find((f) => f.role === ETaskFileRole.JOBS);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-3 flex-shrink-0 shadow-sm">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Tasks
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded-full ring-1 ring-blue-200">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            InvoiceApp
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Task header */}
        <TaskHeader task={task} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="corrections">
              Corrections ({corrections.length})
            </TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4 mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-600 font-medium">
                  Source Data (Jobs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobsFile ? (
                  <JobsSourceDataView taskId={task.id} fileId={jobsFile.id} />
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No jobs file uploaded
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-600 font-medium">
                  Extracted Invoice Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result && result.invoices && result.invoices.length > 0 ? (
                  <InvoicesTable invoices={result.invoices} />
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No invoice data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Correction form */}
            <CorrectionForm
              correctionText={correctionText}
              setCorrectionText={setCorrectionText}
              onSubmit={() => void handleSubmitCorrection()}
            />
          </TabsContent>

          {/* ── Files tab ── */}
          <FilesTab taskId={task.id} files={files} />

          {/* ── Corrections tab ── */}
          <CorrectionsTab corrections={corrections} />

          {/* ── Instructions tab ── */}
          <InstructionsTab />
        </Tabs>
      </main>

      {/* Bottom action bar */}
      <TaskFooter
        onDelete={() => void handleDelete()}
        onReRun={() => void handleReRun()}
        onApprove={() => void handleApprove()}
      />
    </div>
  );
}
