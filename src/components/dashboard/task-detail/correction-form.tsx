'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus } from 'lucide-react';

interface CorrectionFormProps {
  correctionText: string;
  setCorrectionText: (text: string) => void;
  onSubmit: () => void;
}

export function CorrectionForm({
  correctionText,
  setCorrectionText,
  onSubmit,
}: CorrectionFormProps) {
  return (
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
          onClick={onSubmit}
          disabled={!correctionText.trim()}
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> Submit
          Correction
        </Button>
      </CardContent>
    </Card>
  );
}
