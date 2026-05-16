'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Job {
  ref_no: string;
  date: string;
  client: string;
  description: string;
  status: string;
}

interface JobsSourceTableProps {
  jobs: Job[];
}

export function JobsSourceTable({ jobs }: JobsSourceTableProps) {
  return (
    <div>
      <Table className="text-sm table-fixed w-full">
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-transparent">
            <TableHead className="text-slate-600" style={{ width: '15%' }}>
              Ref #
            </TableHead>
            <TableHead className="text-slate-600" style={{ width: '12%' }}>
              Date
            </TableHead>
            <TableHead className="text-slate-600" style={{ width: '15%' }}>
              Client
            </TableHead>
            <TableHead
              className="text-slate-600 whitespace-normal"
              style={{ width: '48%' }}
            >
              Description
            </TableHead>
            <TableHead className="text-slate-600" style={{ width: '10%' }}>
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job, index) => (
            <TableRow
              key={index}
              className="border-slate-200 hover:bg-slate-50"
            >
              <TableCell className="text-slate-700">{job.ref_no}</TableCell>
              <TableCell className="text-slate-700">{job.date}</TableCell>
              <TableCell className="text-slate-700">{job.client}</TableCell>
              <TableCell className="text-slate-700 whitespace-normal">
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
