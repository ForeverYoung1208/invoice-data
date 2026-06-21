'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IMatchedJob, IMatchedPart } from '@/lib/output/types';

interface InvoicesTableProps {
  matchedJobs: IMatchedJob[];
}

/** Returns a Tailwind row bg class based on the highest warningLevel among matched parts. */
function rowBg(parts: IMatchedPart[]): string {
  if (parts.length === 0) return '';
  const max = Math.max(...parts.map((p) => p.warningLevel));
  if (max >= 1) return 'bg-orange-50';
  if (max > 0) return 'bg-yellow-50';
  return '';
}

export function InvoicesTable({ matchedJobs }: InvoicesTableProps) {
  // Group jobs by client
  const grouped = matchedJobs.reduce<Record<string, IMatchedJob[]>>(
    (acc, job) => {
      (acc[job.clientName] ??= []).push(job);
      return acc;
    },
    {},
  );

  if (Object.keys(grouped).length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4 text-center">
        No invoice data available
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([client, jobs]) => (
        <div key={client}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {client}
          </h3>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-slate-600">Job #</TableHead>
                  <TableHead className="text-slate-600">Device</TableHead>
                  <TableHead className="text-slate-600">Part</TableHead>
                  <TableHead className="text-slate-600 w-[60px] text-right">
                    Qty
                  </TableHead>
                  <TableHead className="text-slate-600 w-[80px] text-right">
                    Price
                  </TableHead>
                  <TableHead className="text-slate-600">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) =>
                  job.matchedParts.length === 0 ? (
                    <TableRow key={job.jobNumber} className="bg-yellow-50">
                      <TableCell className="font-mono text-slate-700">
                        {job.jobNumber}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {job.deviceModel}
                      </TableCell>
                      <TableCell
                        colSpan={4}
                        className="text-slate-400 italic"
                      >
                        No parts matched
                      </TableCell>
                    </TableRow>
                  ) : (
                    job.matchedParts.map((part, pi) => (
                      <TableRow
                        key={`${job.jobNumber}-${pi}`}
                        className={rowBg(job.matchedParts)}
                      >
                        {pi === 0 && (
                          <>
                            <TableCell
                              rowSpan={job.matchedParts.length}
                              className="font-mono text-slate-700 align-top"
                            >
                              {job.jobNumber}
                            </TableCell>
                            <TableCell
                              rowSpan={job.matchedParts.length}
                              className="text-slate-600 align-top"
                            >
                              {job.deviceType} {job.deviceModel}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-slate-800">
                          {part.partName}
                          {part.warningLevel >= 1 && (
                            <span
                              className="ml-1 text-orange-600"
                              title="Blacklisted part"
                            >
                              ⚠
                            </span>
                          )}
                          {part.warningLevel > 0 && part.warningLevel < 1 && (
                            <span
                              className="ml-1 text-yellow-600"
                              title="Low confidence match"
                            >
                              ⚡
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-700 text-right">
                          {part.quantity}
                        </TableCell>
                        <TableCell className="text-slate-700 text-right font-medium">
                          {part.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-slate-500 italic">
                          {part.comment ?? ''}
                        </TableCell>
                      </TableRow>
                    ))
                  ),
                )}
                {/* Client subtotal row */}
                <TableRow className="bg-slate-50 font-medium">
                  <TableCell colSpan={4} className="text-slate-600 text-right">
                    Client total
                  </TableCell>
                  <TableCell className="text-slate-800 text-right">
                    {jobs
                      .reduce((sum, j) => sum + j.matchedTotal, 0)
                      .toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
