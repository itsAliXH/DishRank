import { BadgeCheck, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/** Visit confirmed with on-premises receipt + GPS. */
export function VerifiedBadge() {
  return (
    <Badge variant="success" className="gap-1">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      Verified
    </Badge>
  );
}

/**
 * Standard diner review without receipt proof.
 * Used when the venue doesn’t support receipt verify, or the diner skipped verifying.
 */
export function GeneralReviewBadge() {
  return (
    <Badge variant="secondary" className="gap-1 font-medium">
      <MessageSquare className="h-3 w-3" aria-hidden="true" />
      General
    </Badge>
  );
}
