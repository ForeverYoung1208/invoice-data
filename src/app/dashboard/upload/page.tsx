'use client';

/**
 * New Task / Upload
 *
 * Route: /dashboard/upload
 * Purpose: Create a new extraction task by uploading CSV files and optional instructions.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, X, ChevronLeft, Info, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

type FileRole = 'jobs' | 'clients' | 'parts' | 'devices';

interface UploadSlot {
  role: FileRole;
  label: string;
  description: string;
  required: boolean;
  file?: File | null;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const UPLOAD_SLOTS: UploadSlot[] = [
  {
    role: 'jobs',
    label: 'Jobs',
    description: 'CSV with job/invoice records',
    required: true,
  },
  {
    role: 'clients',
    label: 'Clients',
    description: 'CSV with client/customer data',
    required: true,
  },
  {
    role: 'parts',
    label: 'Parts',
    description: 'CSV with parts / line items',
    required: true,
  },
  {
    role: 'devices',
    label: 'Devices',
    description: 'CSV with device / asset data',
    required: true,
  },
];

const ROLE_COLORS: Record<string, string> = {
  jobs: 'bg-blue-50 text-blue-700 border border-blue-200',
  clients: 'bg-purple-50 text-purple-700 border border-purple-200',
  parts: 'bg-amber-50 text-amber-700 border border-amber-200',
  devices: 'bg-green-50 text-green-700 border border-green-200',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();
  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>(UPLOAD_SLOTS);
  const [jobRef, setJobRef] = useState(() => {
    const today = new Date();
    return `JOB-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}-001`;
  });
  const [jobDate, setJobDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── Validation ─────────────────────────────────────────────────────────────

  const EXPECTED_HEADERS: Record<FileRole, string[]> = {
    jobs: [
      '№ заявки',
      'Дата прийому',
      'Прізвище клієнта',
      'Пристрій',
      'Модель',
      'Опис несправності',
      'Статус',
      'Вартість ремонт.',
      'Примітки',
    ],
    clients: [
      'ID клієнта',
      'Прізвище та ініціали',
      'Телефон',
      'Email',
      'Адреса',
      'Тип',
    ],
    parts: [
      'Артикул',
      'Назва',
      'Категорія',
      'Ціна закупівлі (₴)',
      'Ціна продажу (₴)',
      'Наявність',
    ],
    devices: [
      'Категорія',
      'Бренд',
      'Модель',
      'Тип пристрою',
      'Складність ремонту (1-5)',
      'Час ремонту (год)',
      'Типові запчастини',
      'Чорний список запчастин',
      'Примітки',
    ],
  };

  const validateCsvHeaders = async (
    role: FileRole,
    file: File,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const firstLine = text.split('\n')[0].trim();
        const headers = firstLine
          .split(',')
          .map((h) => h.replace(/"/g, '').trim());

        const expected = EXPECTED_HEADERS[role];
        const isValid =
          expected.every((h) => headers.includes(h)) &&
          headers.length === expected.length;

        if (!isValid) {
          setValidationError(
            `Invalid CSV format for ${role}. Expected headers: ${expected.join(', ')}`,
          );
        } else {
          setValidationError(null);
        }
        resolve(isValid);
      };
      reader.onerror = () => {
        setValidationError(`Failed to read file for ${role}`);
        resolve(false);
      };
      reader.readAsText(file.slice(0, 2048));
    });
  };

  const handleFileSelect = async (role: FileRole, file: File | null) => {
    if (file) {
      const isValid = await validateCsvHeaders(role, file);
      if (!isValid) {
        setUploadSlots(
          uploadSlots.map((slot) =>
            slot.role === role ? { ...slot, file: null } : slot,
          ),
        );
        return;
      }
    }

    setUploadSlots(
      uploadSlots.map((slot) =>
        slot.role === role ? { ...slot, file } : slot,
      ),
    );
    setValidationError(null);
  };

  const handleDrag = (e: React.DragEvent, role: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(role);
  };

  const handleDrop = (e: React.DragEvent, role: FileRole) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(role, e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (role: FileRole) => {
    handleFileSelect(role, null);
  };

  const handleSubmit = async () => {
    const requiredSlots = uploadSlots.filter((slot) => slot.required);
    const missingFiles = requiredSlots.filter((slot) => !slot.file);

    if (missingFiles.length > 0) {
      alert(
        `Please upload the following required files: ${missingFiles.map((s) => s.label).join(', ')}`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('jobRef', jobRef);
      formData.append('jobDate', jobDate);
      if (instructions) {
        formData.append('instructions', instructions);
      }

      uploadSlots.forEach((slot) => {
        if (slot.file) {
          formData.append(slot.role, slot.file);
        }
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      const result = await response.json();
      router.push(`/dashboard/task/${result.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      alert(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
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
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium">
            {validationError}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">New Task</h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload CSV files to create a new invoice extraction task
          </p>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 font-medium">
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jobRef" className="text-slate-700 text-sm">
                  Job Reference
                </Label>
                <Input
                  id="jobRef"
                  value={jobRef}
                  onChange={(e) => setJobRef(e.target.value)}
                  placeholder="JOB-2026-05-05-001"
                  className="bg-white border-slate-300 focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jobDate" className="text-slate-700 text-sm">
                  Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="jobDate"
                    type="date"
                    value={jobDate}
                    onChange={(e) => setJobDate(e.target.value)}
                    className="bg-white border-slate-300 focus:border-blue-400 pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadSlots.map((slot) => (
              <div
                key={slot.role}
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive === slot.role
                    ? 'border-blue-400 bg-blue-50'
                    : slot.file
                      ? 'border-green-400 bg-green-50'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                }`}
                onDragOver={(e) => handleDrag(e, slot.role)}
                onDragLeave={(e) => handleDrag(e, null)}
                onDrop={(e) => handleDrop(e, slot.role)}
              >
                {slot.file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {slot.file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(slot.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Badge className={`text-xs ${ROLE_COLORS[slot.role]}`}>
                        {slot.label}
                      </Badge>
                      {slot.required && (
                        <Badge className="text-xs bg-red-50 text-red-700 border border-red-200">
                          Required
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(slot.role)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input
                      type="file"
                      id={`file-${slot.role}`}
                      className="hidden"
                      accept=".csv"
                      onChange={(e) =>
                        handleFileSelect(slot.role, e.target.files?.[0] || null)
                      }
                    />
                    <label
                      htmlFor={`file-${slot.role}`}
                      className="cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        {slot.label}
                      </p>
                      <p className="text-xs text-slate-500 mb-2">
                        {slot.description} (.csv)
                      </p>
                      <p className="text-xs text-blue-600 hover:text-blue-700">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Accepted: .csv
                      </p>
                      {slot.required && (
                        <Badge className="mt-2 text-xs bg-red-50 text-red-700 border border-red-200">
                          Required
                        </Badge>
                      )}
                    </label>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
              <Info className="w-4 h-4" /> Custom Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="instructions" className="text-slate-700 text-sm">
                Add specific instructions for this job (optional)
              </Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Dates are in DD/MM/YYYY format. Ignore rows where status is VOID."
                className="bg-white border-slate-300 focus:border-blue-400 min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Creating Task...' : 'Create Task'}
          </Button>
        </div>
      </main>
    </div>
  );
}
