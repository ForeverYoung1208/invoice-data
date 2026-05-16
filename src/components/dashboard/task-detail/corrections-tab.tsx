'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Clock } from 'lucide-react';

interface Correction {
  id: number | string;
  message: string;
  createdAt: string;
}

interface CorrectionsTabProps {
  corrections: Correction[];
}

export function CorrectionsTab({ corrections }: CorrectionsTabProps) {
  return (
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
            </div >
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
