'use client';

/**
 * Task Detail / Review
 *
 * Route: /dashboard/task/[id]
 * Purpose: View extraction results, correct them, and approve or re-run.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileText,
  ChevronLeft,
  CheckCircle2,
  RotateCcw,
  Trash2,
  MessageSquarePlus,
  Clock,
  Download,
} from 'lucide-react';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RESULT = {
  invoices: [
    {
      invoice_number: 'INV-2026-0042',
      client: 'Acme Corp',
      date: '2026-04-15',
      total: 4850.0,
      line_items: [
        { description: 'Labour – engine service', qty: 2, unit_price: 150.0 },
        { description: 'Oil filter (OEM)', qty: 1, unit_price: 45.0 },
        { description: 'Diagnostic fee', qty: 1, unit_price: 80.0 },
      ],
    },
    {
      invoice_number: 'INV-2026-0043',
      client: 'Beta Industries',
      date: '2026-04-16',
      total: 1200.0,
      line_items: [
        { description: 'Brake pad set', qty: 4, unit_price: 120.0 },
        { description: 'Fitting', qty: 1, unit_price: 80.0 },
      ],
    },
  ],
};

const MOCK_FILES = [
  { name: 'jobs_april_2026.csv', role: 'jobs', size: '42 KB' },
  { name: 'clients.csv', role: 'clients', size: '18 KB' },
  { name: 'parts_catalogue.csv', role: 'parts', size: '95 KB' },
  { name: 'devices_register.csv', role: 'devices', size: '11 KB' },
];

const ROLE_COLORS: Record<string, string> = {
  jobs: 'bg-blue-50 text-blue-700 border border-blue-200',
  clients: 'bg-purple-50 text-purple-700 border border-purple-200',
  parts: 'bg-amber-50 text-amber-700 border border-amber-200',
  devices: 'bg-green-50 text-green-700 border border-green-200',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function JsonViewer({ data }: { data: object }) {
  return (
    <pre className="text-xs text-slate-700 bg-slate-100 rounded-lg p-4 overflow-auto max-h-80 leading-relaxed border border-slate-200">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [correctionText, setCorrectionText] = useState('');
  const [activeTab, setActiveTab] = useState('results');

  // Get the task ID from params
  const taskId = use(params).id;

  // Load task data from API
  useEffect(() => {
    // This will be replaced with real API call to fetch task details
    setTask({
      id: taskId,
      status: 'review',
      createdAt: '2026-04-27 17:30',
      updatedAt: '2026-04-27 17:45',
    });
    setResult(MOCK_RESULT);
    setFiles(MOCK_FILES);

    // Load corrections
    setCorrections([
      {
        id: 1,
        message:
          'Invoice INV-2026-0042 total should be 4850, not 4800. Recalculate from line items.',
        createdAt: '2026-04-27 17:45',
      },
    ]);
  }, [taskId]);

  const handleSubmitCorrection = () => {
    // Submit correction to API
    console.log('Submitting correction:', correctionText);
    setCorrections([
      ...corrections,
      {
        id: corrections.length + 1,
        message: correctionText,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCorrectionText('');
  };

  const handleApprove = () => {
    // Mark task as approved
    console.log('Approving task');
    // TODO: Call API to update status
  };

  const handleReRun = () => {
    // Re-run task
    console.log('Re-running task');
    // TODO: Call API to re-run task
  };

  const handleDelete = () => {
    // Delete task
    console.log('Deleting task');
    // TODO: Call API to delete task and redirect
    router.push('/dashboard');
  };

  if (!task) {
    return <div>Loading...</div>;
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono">{task.id}</h1>
              <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                {task.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Created {task.createdAt}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Updated {task.updatedAt}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download ZIP
            </Button>
          </div>
        </div>

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

          {/* ── Results tab ── */}
          <TabsContent value="results" className="space-y-4 mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-600 font-medium">
                  Extracted Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result && <JsonViewer data={result} />}
              </CardContent>
            </Card>

            {/* Correction form */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4" /> Request Correction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="correction"
                    className="text-slate-700 text-sm"
                  >
                    Describe what needs to be fixed
                  </Label>
                  <Textarea
                    id="correction"
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    placeholder="e.g. The total for INV-2026-0042 is wrong. Recalculate from line items."
                    className="bg-white border-slate-300 focus:border-blue-400 min-h-[80px] text-sm resize-none"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
                  onClick={handleSubmitCorrection}
                  disabled={!correctionText.trim()}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" /> Submit
                  Correction
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Files tab ── */}
          <TabsContent value="files" className="mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="pt-4 space-y-2">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between py-2.5 px-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-800">{f.name}</span>
                      <Badge className={`text-xs ${ROLE_COLORS[f.role]}`}>
                        {f.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500">{f.size}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Corrections tab ── */}
          <TabsContent value="corrections" className="mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="pt-4 space-y-3">
                {corrections.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md bg-slate-50 p-4 space-y-1 border border-slate-200"
                  >
                    <p className="text-sm text-slate-800">{c.message}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {c.createdAt}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Instructions tab ── */}
          <TabsContent value="instructions" className="mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="pt-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Dates are in DD/MM/YYYY format. Map the{' '}
                  <code className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                    ref_no
                  </code>{' '}
                  column to invoice number. Ignore rows where status is{' '}
                  <code className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                    VOID
                  </code>
                  .
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom action bar */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" /> Delete Task
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            onClick={handleReRun}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Re-run
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>
        </div>
      </footer>
    </div>
  );
}
