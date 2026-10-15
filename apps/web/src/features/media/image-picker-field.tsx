'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaImage } from '@/features/dishes/media-image';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Inline picture field: upload a file and/or paste a URL.
 * Uploads go through /media/upload and store a /uploads/… path.
 */
export function ImagePickerField({
  value,
  onChange,
  label = 'Picture',
  disabled,
  className,
  hideLabel,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(!!value && !value.startsWith('/uploads/'));

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await api.uploadMedia(file);
      onChange(url);
      setShowUrl(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const busy = disabled || uploading;
  const hasImage = !!value.trim();

  return (
    <div className={cn('space-y-2', className)}>
      {!hideLabel && (
        <span className="block text-sm font-medium text-foreground">{label}</span>
      )}

      <div
        className={cn(
          'flex flex-col gap-3 rounded-button border border-dashed border-border/90 bg-muted/25 p-3 sm:flex-row sm:items-center',
          hasImage && 'border-solid border-border/70 bg-surface',
        )}
      >
        <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-button border border-border/60 bg-muted sm:mx-0">
          {hasImage ? (
            <MediaImage src={value.trim()} alt="Preview" fill />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {uploading ? 'Uploading…' : 'Upload photo'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setShowUrl((v) => !v)}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showUrl ? 'Hide link' : 'Paste link'}
            </Button>
            {hasImage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  onChange('');
                  setError(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP. Or paste a direct image link.
          </p>
        </div>
      </div>

      {showUrl && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or /uploads/…"
          disabled={busy}
          aria-label={`${label} URL`}
        />
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
