'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Download } from 'lucide-react';

interface TaskHeaderProps {
  task: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export function TaskHeader({ task }: TaskHeaderProps) {
  return (
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
  );
}
