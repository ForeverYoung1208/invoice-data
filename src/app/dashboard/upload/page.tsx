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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, X, ChevronLeft, Info } from 'lucide-react';
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
    required: false,
  },
  {
    role: 'devices',
    label: 'Devices',
    description: 'CSV with device / asset data',
    required: false,
  },
];

export default function UploadPage() {
  return (
    <div className="p-4">
      <h1>Upload Page placeholder</h1>
    </div>
  );
}
