'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

export function InstructionsTab() {
  return (
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
            </code>.
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
