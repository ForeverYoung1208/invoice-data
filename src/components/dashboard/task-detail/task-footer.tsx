'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';

interface TaskFooterProps {
  onDelete: () => void;
  onReRun: () => void;
  onApprove: () => void;
  disabled?: boolean;
}

export function TaskFooter({ onDelete, onReRun, onApprove, disabled = false }: TaskFooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="w-4 h-4" /> Delete Task
      </Button>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          onClick={onReRun}
          disabled={disabled}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Re-run
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          onClick={onApprove}
          disabled={disabled}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
        </Button>
      </div >
    </footer>
  );
}
