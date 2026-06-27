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
import { createPortal } from 'react-dom';
import { useEffect, useState, use } from 'react';
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
import { ReuploadPanel } from '@/components/dashboard/task-detail/reupload-panel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { TTaskUpdateDto } from '@/lib/contracts/schemas/task.schema';
import {
  DATE_TIME_FORMAT,
  ETaskFileRole,
  ETaskStatus,
  JOB_STATUS_COLUMN,
} from '@/lib/constants';
import { useApi } from '../../../../lib/client/useApi';
import { apiRoutes } from '../../../../lib/client/api-routes';

const PROCESSING_STATUSES = new Set<ETaskStatus>([
  ETaskStatus.QUEUED,
  ETaskStatus.PROCESSING,
]);

const INSTRUCTIONS_EDITABLE_STATUSES = new Set<ETaskStatus>([
  ETaskStatus.UPLOADED,
  ETaskStatus.REVIEW,
]);

export default function TaskDetailPage({
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ id: string }>;
}) {
  const { id: taskId } = use(params);

  const router = useRouter();
  const [correctionText, setCorrectionText] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setFooterHost(document.body);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => useApi(apiRoutes.tasks.detail, { params: [taskId] }),
    // Poll every 3 s while the task is being processed
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && PROCESSING_STATUSES.has(status) ? 3000 : false;
    },
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

  const matchedJobs: any[] =
    (latestResult?.resultJson as any)?.matchedJobs ?? [];

  const isProcessing = task ? PROCESSING_STATUSES.has(task.status) : false;
  const isCompleted = task?.status === ETaskStatus.COMPLETED;
  const isUploaded = task?.status === ETaskStatus.UPLOADED;
  const canEditInstructions = task
    ? INSTRUCTIONS_EDITABLE_STATUSES.has(task.status)
    : false;

  const taskPatchMutation = useMutation({
    mutationFn: (body: TTaskUpdateDto) =>
      useApi(apiRoutes.tasks.patch, { params: [taskId], body }),
    onSuccess: async () => {
      setCorrectionText('');
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const taskProcessMutation = useMutation({
    mutationFn: () => useApi(apiRoutes.tasks.process, { params: [taskId] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const taskDeleteMutation = useMutation({
    mutationFn: () => useApi(apiRoutes.tasks.delete, { params: [taskId] }),
    onSuccess: () => router.push('/dashboard'),
  });

  const taskReturnToReviewMutation = useMutation({
    mutationFn: () =>
      useApi(apiRoutes.tasks.returnToReview, { params: [taskId] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const instructionsMutation = useMutation({
    mutationFn: (instructions: string | null) =>
      useApi(apiRoutes.tasks.patch, {
        params: [taskId],
        body: { instructions },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleSubmitCorrection = async () => {
    const correction = correctionText.trim();
    await taskPatchMutation.mutateAsync({ correction });
    // Re-queue so the worker picks up the correction
    taskProcessMutation.mutate();
  };

  const handleApprove = () => {
    taskPatchMutation.mutate({ status: ETaskStatus.COMPLETED });
  };

  const handleReRun = () => {
    taskProcessMutation.mutate();
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    taskDeleteMutation.mutate();
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

      <main
        className="flex-1 max-w-4xl mx-auto w-full px-6 pt-8 space-y-6"
        style={{ paddingBottom: '12rem' }}
      >
        {/* Task header */}
        <TaskHeader task={task} zipPath={latestResult?.zipPath} />

        {/* Processing banner */}
        {isProcessing && (
          <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>
              Task is <strong>{task.status}</strong> — results will appear
              automatically when processing completes.
            </span>
          </div>
        )}

        {/* Error message from worker */}
        {task.status === ETaskStatus.FAILED && data?.errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Processing failed:</strong> {data.errorMessage}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="corrections">
              Corrections ({corrections.length})
            </TabsTrigger>
            <TabsTrigger value="instructions">
              Task-wide Instructions
            </TabsTrigger>
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
                  <JobsSourceDataView
                    taskId={task.id}
                    fileId={jobsFile.id}
                    statusColumn={JOB_STATUS_COLUMN}
                  />
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
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </div>
                ) : matchedJobs.length > 0 ? (
                  <InvoicesTable matchedJobs={matchedJobs} />
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No invoice data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Correction form */}
            {!isCompleted && (
              <CorrectionForm
                correctionText={correctionText}
                setCorrectionText={setCorrectionText}
                onSubmit={() => void handleSubmitCorrection()}
                disabled={isProcessing || taskPatchMutation.isPending}
              />
            )}

            {/* Re-upload panel */}
            {!isCompleted && (
              <ReuploadPanel
                taskId={task.id}
                disabled={isProcessing}
                onReplaced={() => taskProcessMutation.mutate()}
              />
            )}
          </TabsContent>

          {/* ── Files tab ── */}
          <FilesTab taskId={task.id} files={files} />

          {/* ── Corrections tab ── */}
          <CorrectionsTab corrections={corrections} />

          {/* ── Instructions tab ── */}
          <InstructionsTab
            instructions={data?.instructions ?? null}
            canEdit={canEditInstructions}
            isSaving={instructionsMutation.isPending}
            onSave={async (instructions) => {
              await instructionsMutation.mutateAsync(instructions);
            }}
          />
        </Tabs>
      </main>

      {footerHost
        ? createPortal(
            <div
              className="z-30 border-t border-slate-200/70 bg-slate-50/95 pt-4 shadow-[0_-12px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm"
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                top: 'auto',
                backgroundColor: 'rgba(248, 250, 252, 0.97)',
              }}
            >
              <div className="mx-auto w-full max-w-4xl px-6 pb-6">
                <TaskFooter
                  onDelete={() => void handleDelete()}
                  onReRun={() => void handleReRun()}
                  onApprove={() => void handleApprove()}
                  onReturnToReview={() => taskReturnToReviewMutation.mutate()}
                  disabled={isProcessing}
                  completed={isCompleted}
                  runLabel={isUploaded ? 'Run task' : 'Re-run'}
                  approveDisabled={isUploaded}
                />
              </div>
            </div>,
            footerHost,
          )
        : null}
    </div>
  );
}
