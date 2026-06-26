'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, Trash2, Undo2 } from 'lucide-react';

interface TaskFooterProps {
  onDelete: () => void;
  onReRun: () => void;
  onApprove: () => void;
  onReturnToReview: () => void;
  disabled?: boolean;
  completed?: boolean;
}

export function TaskFooter({
  onDelete,
  onReRun,
  onApprove,
  onReturnToReview,
  disabled = false,
  completed = false,
}: TaskFooterProps) {
  return (
    <footer className="pointer-events-auto flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4" /> Delete Task
      </Button>
      <div className="flex gap-3">
        {completed ? (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            onClick={onReturnToReview}
          >
            <Undo2 className="w-3.5 h-3.5" /> Return to Review
          </Button>
        ) : (
          <>
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
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
              onClick={onApprove}
              disabled={disabled}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </Button>
          </>
        )}
      </div>
    </footer>
  );
}
