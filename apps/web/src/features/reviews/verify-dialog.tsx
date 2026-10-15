'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Upload, CheckCircle } from 'lucide-react';
import { useLocation } from '@/providers/location-context';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';

interface VerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  restaurantName: string;
  /** When true, GPS near the venue is required. */
  requireOnSite?: boolean;
  onSuccess: () => void;
}

export function VerifyDialog({
  open,
  onOpenChange,
  reviewId,
  restaurantName,
  requireOnSite = true,
  onSuccess,
}: VerifyDialogProps) {
  const [step, setStep] = useState(1);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setReceiptFile(null);
      setLoading(false);
      setError(null);
    }
  }, [open]);
  const {
    lat,
    lng,
    requestLocation,
    loading: locLoading,
    error: locError,
  } = useLocation();
  const { useMockAuth } = useAuth();
  const hasLocation = lat != null && lng != null;

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setStep(2);
      setError(null);
      if (requireOnSite) void requestLocation();
    }
  };

  const handleEnableLocation = () => {
    setError(null);
    void requestLocation();
  };

  const handleSubmit = async () => {
    if (!receiptFile) return;
    setLoading(true);
    setError(null);
    try {
      if (useMockAuth) {
        onSuccess();
        onOpenChange(false);
        return;
      }
      if (requireOnSite && (lat == null || lng == null)) {
        setError('Enable location to verify you are near the restaurant.');
        return;
      }
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      if (lat != null && lng != null) {
        formData.append('gpsLat', String(lat));
        formData.append('gpsLng', String(lng));
      }
      await api.verifyReview(reviewId, formData);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Your Visit</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {requireOnSite
            ? `Upload your receipt and confirm you are near ${restaurantName || 'the restaurant'} (~1 km).`
            : `Upload your receipt for ${restaurantName || 'this restaurant'} — you can do this from anywhere.`}{' '}
          An admin reviews the receipt before your rating shows as Verified.
        </p>

        <div className="flex gap-2 my-4">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${step >= s ? 'bg-primary' : 'bg-muted'}`}
              aria-label={`Step ${s}`}
            />
          ))}
        </div>

        {step === 1 && (
          <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-card cursor-pointer hover:border-primary transition-colors min-h-[200px]">
            <Upload className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">Upload receipt photo</span>
            <span className="text-xs text-muted-foreground">Tap to open camera or file picker</span>
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

        {step === 2 && (
          <div className="space-y-4">
            {receiptFile && (
              <p className="text-sm text-success flex items-center gap-2">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                Receipt uploaded: {receiptFile.name}
              </p>
            )}
            {requireOnSite ? (
              <div className="p-4 rounded-card bg-muted flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-2">
                  {locLoading ? (
                    <p className="text-sm">Getting your location...</p>
                  ) : hasLocation ? (
                    <>
                      <p className="text-sm font-medium">Location captured</p>
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll check you&apos;re near {restaurantName} (within 1 km).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Allow location so we can confirm you&apos;re near the restaurant.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEnableLocation}
                        disabled={locLoading}
                      >
                        Enable location
                      </Button>
                    </>
                  )}
                  {locError && !locLoading && (
                    <p className="text-sm text-red-600" role="alert">
                      {locError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Location is not required for this restaurant — you can submit from anywhere.
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              onClick={handleSubmit}
              disabled={
                loading ||
                !receiptFile ||
                (requireOnSite && !useMockAuth && !hasLocation)
              }
            >
              {loading ? 'Submitting…' : 'Submit for admin review'}
            </Button>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
