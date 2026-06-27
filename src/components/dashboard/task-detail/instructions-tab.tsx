'use client';

import { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TabsContent } from '@/components/ui/tabs';

interface InstructionsTabProps {
  instructions: string | null;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (instructions: string | null) => Promise<void>;
}

export function InstructionsTab({
  instructions,
  canEdit,
  isSaving,
  onSave,
}: InstructionsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftInstructions, setDraftInstructions] = useState(
    instructions ?? '',
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const normalizedInstructions = instructions?.trim() || null;
  const normalizedDraft = draftInstructions.trim();

  useEffect(() => {
    setDraftInstructions(instructions ?? '');
  }, [instructions]);

  const handleCancel = (): void => {
    setDraftInstructions(instructions ?? '');
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaveError(null);
      await onSave(normalizedDraft || null);
      setIsEditing(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Failed to save task-wide instructions',
      );
    }
  };

  return (
    <TabsContent value="instructions" className="mt-4">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="space-y-4 pt-4">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={draftInstructions}
                onChange={(e) => setDraftInstructions(e.target.value)}
                placeholder="e.g. Dates are in DD/MM/YYYY format. Ignore rows where status is VOID."
                className="min-h-[140px] resize-none bg-white border-slate-300 focus:border-blue-400"
                disabled={isSaving}
              />
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {normalizedInstructions ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                  {normalizedInstructions}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  No global instructions were added for this task.
                </p>
              )}
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={isSaving}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
