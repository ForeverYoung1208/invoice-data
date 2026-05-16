'use client';

/**
 * Dashboard / Task List
 *
 * Route: /dashboard
 * Purpose: Main landing page after login. Lists all tasks with status, date, and actions.
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Trash2, Eye, FileText, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { TaskStatus } from '@/lib/db/enums';

// ── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  status: TaskStatus;
  createdAt: string;
  filesCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<TaskStatus, string> = {
  uploaded: 'bg-slate-100 text-slate-700 border border-slate-300',
  queued: 'bg-blue-50 text-blue-700 border border-blue-200',
  processing: 'bg-amber-50 text-amber-700 border border-amber-200',
  review: 'bg-purple-50 text-purple-700 border border-purple-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<
    { label: string; status: TaskStatus; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from API
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) throw new Error('Failed to fetch tasks');
        const data: Task[] = await res.json();
        setTasks(data);

        // Compute stats from actual data
        const allStatuses = Object.values(TaskStatus) as TaskStatus[];
        const computedStats = allStatuses.map((status) => ({
          label: status.charAt(0).toUpperCase() + status.slice(1),
          status,
          count: data.filter((t) => t.status === status).length,
        }));
        setStats(computedStats);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tasks',
        );
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading
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
            <Card key={status} className="bg-white border-slate-200 shadow-sm">
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

        {/* Task table */}
        <Card className="bg-white border-slate-200 shadow-sm">
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
              {loading ? (
                <TableRow className="border-slate-200">
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow className="border-slate-200">
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No tasks yet. Create your first task!
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
                        {task.id.slice(0, 8)}…
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
                      {new Date(task.createdAt).toLocaleString('uk-UA')}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
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
        </Card>
      </main>
    </div>
  );
}
