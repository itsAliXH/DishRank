'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CategorySelect } from '@/components/shell/category-select';

interface CategoryFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentId?: string;
  currentName: string;
  busy?: boolean;
  onSave: (categoryId: string) => Promise<void> | void;
}

export function CategoryFixDialog({
  open,
  onOpenChange,
  title,
  currentId = '',
  currentName,
  busy,
  onSave,
}: CategoryFixDialogProps) {
  const [id, setId] = useState(currentId);
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) {
      setId(currentId);
      setName(currentName);
    }
  }, [open, currentId, currentName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an existing category. Type to filter the list.
          </p>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <CategorySelect
            variant="inline"
            valueId={id}
            valueName={name}
            onChange={({ id: nextId, name: nextName }) => {
              setId(nextId);
              setName(nextName);
            }}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!id || busy || id === currentId}
            onClick={async () => {
              await onSave(id);
              onOpenChange(false);
            }}
          >
            {busy ? 'Saving…' : 'Save category'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
