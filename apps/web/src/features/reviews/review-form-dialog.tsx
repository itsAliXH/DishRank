'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/features/reviews/star-rating';
import { useAuth } from '@/providers/auth-context';
import { useLocation } from '@/providers/location-context';
import { api } from '@/lib/api';
import { MapPin, Upload, X } from 'lucide-react';

export type ReviewSubmitResult = {
  reviewId: string;
  /** True when a receipt was uploaded in this popup (pending admin verify). */
  withReceipt: boolean;
};

interface ReviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dishId: string;
  dishName: string;
  restaurantName?: string;
  /** Verified mode — receipt path available. */
  canVerify?: boolean;
  /** Verified mode + General allowed (rating alone → General). */
  allowGeneral?: boolean;
  /** When true, receipt upload requires GPS near the venue. */
  requireOnSite?: boolean;
  onSuccess: (result: ReviewSubmitResult) => void;
  onLoginRequired: () => void;
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  dishId,
  dishName,
  restaurantName,
  canVerify = false,
  allowGeneral = true,
  requireOnSite = true,
  onSuccess,
  onLoginRequired,
}: ReviewFormDialogProps) {
  const { user, useMockAuth } = useAuth();
  const {
    lat,
    lng,
    requestLocation,
    loading: locLoading,
    error: locError,
  } = useLocation();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showReceipt = canVerify;
  const receiptRequired = canVerify && !allowGeneral;
  const hasLocation = lat != null && lng != null;

  useEffect(() => {
    if (!open) {
      setRating(0);
      setText('');
      setReceiptFile(null);
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setError(null);
    if (requireOnSite) void requestLocation();
  };

  const clearReceipt = () => {
    setReceiptFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLoginRequired();
      return;
    }
    if (rating === 0) return;

    if (receiptRequired && !receiptFile) {
      setError('A receipt photo is required for Verified reviews at this restaurant.');
      return;
    }

    if (receiptFile && requireOnSite && !useMockAuth) {
      if (!hasLocation) {
        setError('Enable location so we can confirm you are near the restaurant (~1 km).');
        void requestLocation();
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (useMockAuth) {
        onSuccess({ reviewId: 'mock-review-id', withReceipt: !!receiptFile });
        onOpenChange(false);
        return;
      }

      const review = await api.submitReview(dishId, {
        rating,
        text: text || undefined,
      });

      let withReceipt = false;
      if (receiptFile) {
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        if (lat != null && lng != null) {
          formData.append('gpsLat', String(lat));
          formData.append('gpsLng', String(lng));
        }
        await api.verifyReview(review.id, formData);
        withReceipt = true;
      }

      onSuccess({ reviewId: review.id, withReceipt });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled =
    rating === 0 ||
    loading ||
    (receiptRequired && !receiptFile) ||
    (!!receiptFile &&
      requireOnSite &&
      !useMockAuth &&
      (locLoading || !hasLocation));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {dishName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {showReceipt && allowGeneral ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Without a receipt this publishes as{' '}
              <span className="font-medium text-foreground">General</span>. Attach an on-site
              receipt to request <span className="font-medium text-foreground">Verified</span>{' '}
              (admin approves).
            </p>
          ) : showReceipt && !allowGeneral ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              This venue is <span className="font-medium text-foreground">Verified only</span> — a
              receipt photo is required. An admin must approve before it appears.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              This restaurant only supports{' '}
              <span className="font-medium text-foreground">General</span> reviews (no receipt
              step).
            </p>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">Your rating</p>
            <StarRating rating={rating} size="lg" interactive onChange={setRating} />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience (optional)"
            className="w-full min-h-[100px] rounded-button border border-border bg-surface p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Review text"
          />

          {showReceipt && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Receipt photo
                {receiptRequired ? (
                  <span className="text-destructive"> *</span>
                ) : (
                  <span className="text-muted-foreground"> (optional)</span>
                )}
              </p>
              {receiptFile ? (
                <div className="flex items-center gap-2 rounded-button border border-border bg-muted/30 px-3 py-2.5">
                  <Upload className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm">{receiptFile.name}</span>
                  {!receiptRequired && (
                    <button
                      type="button"
                      onClick={clearReceipt}
                      className="rounded-button p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Remove receipt"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-button border-2 border-dashed border-border px-3 py-5 transition-colors hover:border-primary/50">
                  <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">
                    {receiptRequired ? 'Upload receipt photo' : 'Upload receipt (optional)'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {requireOnSite
                      ? `On-site · within ~1 km of ${restaurantName || 'the restaurant'}`
                      : 'You can upload from anywhere'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleReceiptChange}
                    aria-label="Upload receipt photo"
                  />
                </label>
              )}

              {receiptFile && requireOnSite && (
                <div className="flex items-start gap-2 rounded-button border border-border/70 bg-surface px-2.5 py-2 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    {locLoading ? (
                      <p>Getting your location…</p>
                    ) : hasLocation ? (
                      <p>Location ready — we’ll check you’re near the restaurant.</p>
                    ) : (
                      <>
                        <p>Location is required with a receipt for this venue.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void requestLocation()}
                        >
                          Enable location
                        </Button>
                      </>
                    )}
                    {locError && !locLoading && (
                      <p className="text-destructive" role="alert">
                        {locError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitDisabled}>
            {loading
              ? receiptFile
                ? 'Submitting for verification…'
                : 'Submitting…'
              : receiptFile
                ? 'Submit with receipt'
                : 'Submit Review'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
