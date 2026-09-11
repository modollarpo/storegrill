'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/components/feedback/Toast';

interface WriteReviewProps {
  productId: string;
  onSubmit?: () => void;
}

export function WriteReview({ productId, onSubmit }: WriteReviewProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      toast({ variant: 'error', title: 'Rating required', description: 'Please select a star rating' });
      return;
    }

    setSubmitting(true);
    try {
      await api('/api/v1/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          rating,
          title: title || undefined,
          body: body || undefined,
        }),
      });
      toast({ variant: 'success', title: 'Review submitted', description: 'Your review has been posted' });
      onSubmit?.();
    } catch (e: any) {
      toast({ variant: 'error', title: 'Failed to submit', description: e?.message || 'Please try again' });
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-6">
      <h3 className="text-base font-extrabold text-text-primary mb-4">Write a Review</h3>

      <div className="mb-4">
        <label className="block text-xs font-bold text-text-secondary mb-2">Your rating</label>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <svg
                className={cn('w-8 h-8 transition-colors', (hoverRating || rating) >= star ? 'text-amber-500' : 'text-smoke-200')}
                viewBox="0 0 24 24"
                fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          ))}
          {rating > 0 && <span className="text-sm text-text-secondary ml-2">{rating}/5</span>}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-bold text-text-secondary mb-1.5">Title (optional)</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="input w-full"
          maxLength={200}
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-bold text-text-secondary mb-1.5">Your review (optional)</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What did you like or dislike? How was the quality?"
          className="input w-full min-h-[100px]"
          maxLength={5000}
        />
        <p className="text-[11px] text-text-tertiary mt-1">{body.length}/5000</p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="btn btn-primary w-full sm:w-auto"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}
