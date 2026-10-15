'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MediaImage } from '@/features/dishes/media-image';
import { api } from '@/lib/api';

export function ImageUrlDialog({
  open,
  onOpenChange,
  title,
  currentUrl,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentUrl?: string | null;
  busy?: boolean;
  onSave: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(currentUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(currentUrl || '');
      setError(null);
    }
  }, [open, currentUrl]);

  const save = async () => {
    setError(null);
    await onSave(url.trim());
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url: uploaded } = await api.uploadMedia(file);
      setUrl(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative mx-auto h-36 w-full overflow-hidden rounded-button border border-border bg-muted">
            <MediaImage src={url.trim() || null} alt="Preview" fill />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Upload image</label>
            <Input
              type="file"
              accept="image/*"
              disabled={busy || uploading}
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Or paste image URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… or /uploads/…"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a file or paste a direct http(s) link. Leave blank to remove the picture.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={busy || uploading} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || uploading} onClick={save}>
              {busy || uploading ? 'Saving…' : 'Save picture'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
