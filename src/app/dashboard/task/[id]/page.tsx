'use client';

/**
 * Task Detail / Review
 *
 * Route: /dashboard/task/[id]
 * Purpose: View extraction results, correct them, and approve or re-run.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const MOCK_JOBS_SOURCE = [
  {
    ref_no: 'JOB-2026-0042',
    date: '15/04/2026',
    client: 'Acme Corp',
    description: 'Engine service – full inspection, oil change, filter replacement. Diagnostic check on turbo.',
    status: 'OPEN',
  },
  {
    ref_no: 'JOB-2026-0043',
    date: '16/04/2026',
    client: 'Beta Industries',
    description: 'Replace front brake pads (all 4 wheels). Fitting included.',
    status: 'OPEN',
  },
  {
    ref_no: 'JOB-2026-0044',
    date: '16/04/2026',
    client: 'Acme Corp',
    description: 'Windshield wiper replacement, cabin air filter swap.',
    status: 'VOID',
  },
  {
    ref_no: 'JOB-2026-0045',
    date: '17/04/2026',
    client: 'Gamma LLC',
    description: 'Scheduled maintenance – 60k km service. Check belts, fluids, battery.',
    status: 'OPEN',
  },
];

const ROLE_COLORS: Record<string, string> = {
  jobs: 'bg-blue-50 text-blue-700 border border-blue-200',
  clients: 'bg-purple-50 text-purple-700 border border-purple-200',
  parts: 'bg-amber-50 text-amber-700 border border-amber-200',
  devices: 'bg-green-50 text-green-700 border border-green-200',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function JobsSourceTable({
  jobs,
}: {
  jobs: { ref_no: string; date: string; client: string; description: string; status: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-transparent">
            <TableHead className="text-slate-600 w-[120px]">Ref #</TableHead>
            <TableHead className="text-slate-600 w-[100px]">Date</TableHead>
            <TableHead className="text-slate-600 w-[130px]">Client</TableHead>
            <TableHead className="text-slate-600">Description</TableHead>
            <TableHead className="text-slate-600 w-[80px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job, index) => (
            <TableRow
              key={index}
              className="border-slate-200 hover:bg-slate-50"
            >
              <TableCell className="font-mono text-slate-700">
                {job.ref_no}
              </TableCell>
              <TableCell className="text-slate-700">{job.date}</TableCell>
              <TableCell className="text-slate-800">{job.client}</TableCell>
              <TableCell className="text-slate-700 text-xs">
                {job.description}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    job.status === 'VOID'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }
                >
                  {job.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InvoicesTable({ invoices }: { invoices: any[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-transparent">
            <TableHead className="text-slate-600 w-[120px]">
              Invoice #
            </TableHead>
            <TableHead className="text-slate-600">Client</TableHead>
            <TableHead className="text-slate-600 w-[120px]">Date</TableHead>
            <TableHead className="text-slate-600 w-[120px] text-right">
              Total
            </TableHead>
            <TableHead className="text-slate-600">Items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices && invoices.length > 0 ? (
            invoices.map((invoice, index) => (
              <TableRow
                key={index}
                className="border-slate-200 hover:bg-slate-50"
              >
                <TableCell className="font-mono text-slate-700">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell className="text-slate-800">
                  {invoice.client}
                </TableCell>
                <TableCell className="text-slate-700">{invoice.date}</TableCell>
                <TableCell className="text-slate-800 text-right font-medium">
                  {invoice.total?.toFixed(2)}
                </TableCell>
                <TableCell className="text-slate-700">
                  {invoice.line_items && invoice.line_items.length > 0 ? (
                    <div className="space-y-1">
                      {invoice.line_items.map((item: any, i: number) => (
                        <div key={i} className="text-xs text-slate-600">
                          {item.qty}x {item.description} @ {item.unit_price}
                        </div>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-slate-500 py-4"
              >
                No invoice data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TaskDetailPage({
  searchParams,
  params,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { id: string };
}) {
  // Handle async params using React.use() as per Next.js 16.2.4 requirements
  const paramsResolved = params as unknown as Promise<{ id: string }>;
  const { id: taskId } = use(paramsResolved);

  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [correctionText, setCorrectionText] = useState('');
  const [activeTab, setActiveTab] = useState('results');

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

          <TabsContent value="results" className="space-y-4 mt-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-600 font-medium">
                  Source Data (Jobs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JobsSourceTable jobs={MOCK_JOBS_SOURCE} />
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
