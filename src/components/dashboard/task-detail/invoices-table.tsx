'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InvoiceLineItem {
  qty: number | string;
  description: string;
  unit_price: number | string;
}

interface Invoice {
  invoice_number: string;
  client: string;
  date: string;
  total: number;
  line_items?: InvoiceLineItem[];
}

interface InvoicesTableProps {
  invoices: Invoice[];
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
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
                      {invoice.line_items.map((item, i) => (
                        <div key={i} className="text-xs text-slate-600">
                          {item.qty}x {item.description} @ {item.unit_price}
                        </div >
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
