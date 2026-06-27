'use client';

/**
 * Dashboard / Task List
 *
 * Route: /dashboard
 * Purpose: Main landing page after login. Lists all tasks with status, date, and actions.
 */

import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../lib/client/useApi';
import { apiRoutes } from '../../lib/client/api-routes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Eye,
  Undo2,
  CheckCircle2,
  FileText,
  LogOut,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import dayjs from 'dayjs';
import { DATE_TIME_FORMAT, ETaskStatus } from '../../lib/constants';
import type { TTaskListItemDto } from '../../lib/contracts/schemas/task.schema';
import type { ReactElement } from 'react';

const STATUS_STYLES: Record<ETaskStatus, string> = {
  [ETaskStatus.UPLOADED]: 'bg-slate-100 text-slate-700 border border-slate-300',
  [ETaskStatus.QUEUED]: 'bg-blue-50 text-blue-700 border border-blue-200',
  [ETaskStatus.PROCESSING]:
    'bg-amber-50 text-amber-700 border border-amber-200',
  [ETaskStatus.REVIEW]: 'bg-purple-50 text-purple-700 border border-purple-200',
  [ETaskStatus.COMPLETED]: 'bg-green-50 text-green-700 border border-green-200',
  [ETaskStatus.FAILED]: 'bg-red-50 text-red-700 border border-red-200',
};

interface TaskTableProps {
  title: string;
  tasks: TTaskListItemDto[];
  isLoading: boolean;
  emptyMessage: string;
  onDelete: (id: string) => void;
  onReturnToReview?: (id: string) => void;
  onApprove?: (id: string) => void;
}

function TaskTable({
  title,
  tasks,
  isLoading,
  emptyMessage,
  onDelete,
  onReturnToReview,
  onApprove,
}: TaskTableProps): ReactElement {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-600 font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="text-slate-600">Task ID</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="text-slate-600">Files</TableHead>
              <TableHead className="text-slate-600">Created</TableHead>
              <TableHead className="text-slate-600 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-slate-200">
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow className="border-slate-200">
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="border-slate-200 hover:bg-slate-50"
                >
                  <TableCell className="font-mono text-sm text-slate-700">
                    <Link
                      href={`/dashboard/task/${task.id}`}
                      className="hover:underline"
                    >
                      {task.id.slice(0, 8)}...
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[task.status]}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {task.filesCount}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {dayjs(task.createdAt).format(DATE_TIME_FORMAT)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/task/${task.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {onReturnToReview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700"
                          onClick={() => void onReturnToReview(task.id)}
                          title="Return to review"
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onApprove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => void onApprove(task.id)}
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => void onDelete(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage(): ReactElement {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => useApi(apiRoutes.tasks.list, { params: [] }),
  });

  // Compute stats from actual data
  const stats = Object.values(ETaskStatus).map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));

  const activeTasks = tasks.filter(
    (task) => task.status !== ETaskStatus.COMPLETED,
  );
  const completedTasks = tasks.filter(
    (task) => task.status === ETaskStatus.COMPLETED,
  );

  const taskDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      useApi(apiRoutes.tasks.delete, { params: [id] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const taskReturnToReviewMutation = useMutation({
    mutationFn: (id: string) =>
      useApi(apiRoutes.tasks.returnToReview, { params: [id] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    taskDeleteMutation.mutate(id);
  };

  const handleReturnToReview = (id: string) => {
    if (!confirm('Return this task to review status?')) return;
    taskReturnToReviewMutation.mutate(id);
  };

  const taskApproveMutation = useMutation({
    mutationFn: (id: string) =>
      useApi(apiRoutes.tasks.patch, {
        params: [id],
        body: { status: ETaskStatus.COMPLETED },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleApprove = (id: string) => {
    if (!confirm('Approve this task and mark as completed?')) return;
    taskApproveMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded-full ring-1 ring-blue-200">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            InvoiceApp
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-slate-900"
          onClick={() => void signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Page title + New Task */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-slate-600 mt-1">
              All invoice extraction jobs
            </p>
          </div>
          <Link href="/dashboard/upload">
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Task
            </Button>
          </Link>
        </div>

        {isError && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error.message}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Loading...
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </CardContent>
                </Card>
              ))
            : stats.map(({ label, status, count }) => (
                <Card
                  key={status}
                  className="bg-white border-slate-200 shadow-sm"
                >
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{count}</span>
                      <Badge className={STATUS_STYLES[status]}>{status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        <TaskTable
          title="Active Tasks"
          tasks={activeTasks}
          isLoading={isLoading}
          emptyMessage={
            tasks.length === 0
              ? 'No tasks yet. Create your first task!'
              : 'No active tasks.'
          }
          onDelete={handleDelete}
          onApprove={handleApprove}
        />

        <TaskTable
          title="Completed Tasks"
          tasks={completedTasks}
          isLoading={isLoading}
          emptyMessage="No completed tasks yet."
          onDelete={handleDelete}
          onReturnToReview={handleReturnToReview}
        />
      </main>
    </div>
  );
}
