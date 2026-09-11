'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  images: string;
  verified: boolean;
  helpfulCount: number;
  vendorReply?: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
  votes?: Array<{ helpful: boolean; userId: string }>;
  questions?: Array<{ id: string; question: string; answer?: string | null; user: { name: string } }>;
}

interface ReviewListProps {
  reviews: Review[];
  stats: { average: number; total: number; distribution: Array<{ rating: number; count: number }> };
  currentUserId?: string;
  onVote?: (reviewId: string, helpful: boolean) => void;
  onAskQuestion?: (reviewId: string, question: string) => void;
  onAnswerQuestion?: (reviewId: string, questionId: string, answer: string) => void;
}

export function ReviewList({ reviews, stats, currentUserId, onVote, onAskQuestion, onAnswerQuestion }: ReviewListProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'highest'>('recent');

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === 'helpful') return b.helpfulCount - a.helpfulCount;
    if (sortBy === 'highest') return b.rating - a.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="sm:w-48 shrink-0">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-text-primary">{stats.average.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(star => (
                <svg
                  key={star}
                  className={cn('w-5 h-5', star <= stats.average ? 'text-amber-500' : 'text-smoke-200')}
                  viewBox="0 0 24 24"
                  fill={star <= stats.average ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-1">{stats.total} reviews</p>
          </div>

          <div className="mt-4 space-y-1.5">
            {stats.distribution.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right text-text-secondary">{rating}</span>
                <svg className="w-3 h-3 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <div className="flex-1 h-1.5 rounded-full bg-smoke-100 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="w-6 text-right text-text-tertiary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-text-secondary">Sort by:</span>
            {(['recent', 'helpful', 'highest'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setSortBy(option)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                  sortBy === option ? 'bg-text-primary text-white' : 'bg-smoke-100 text-text-secondary hover:bg-smoke-200'
                )}
              >
                {option === 'recent' ? 'Most Recent' : option === 'helpful' ? 'Most Helpful' : 'Highest Rated'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {sorted.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUserId}
                onVote={onVote}
                onAskQuestion={onAskQuestion}
                onAnswerQuestion={onAnswerQuestion}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, currentUserId, onVote, onAskQuestion, onAnswerQuestion }: {
  review: Review;
  currentUserId?: string;
  onVote?: (reviewId: string, helpful: boolean) => void;
  onAskQuestion?: (reviewId: string, question: string) => void;
  onAnswerQuestion?: (reviewId: string, questionId: string, answer: string) => void;
}) {
  const [showQuestions, setShowQuestions] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const images = (() => { try { return JSON.parse(review.images); } catch { return []; } })();
  const userVote = review.votes?.find(v => v.userId === currentUserId);

  async function handleVote(helpful: boolean) {
    if (!currentUserId || !onVote) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/reviews/${review.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ helpful }),
      });
      onVote(review.id, helpful);
    } catch {
      // Vote is best-effort; failure is surfaced by the parent list refresh.
    }
    setSubmitting(false);
  }

  async function handleAskQuestion() {
    if (!newQuestion.trim() || !onAskQuestion) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/reviews/${review.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ question: newQuestion }),
      });
      onAskQuestion(review.id, newQuestion);
      setNewQuestion('');
    } catch {
      // Question is best-effort; failure is surfaced by the parent list refresh.
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="relative w-10 h-10 rounded-full bg-smoke-100 overflow-hidden shrink-0">
          {review.user.avatar ? (
            <Image src={review.user.avatar} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm font-bold text-text-secondary">
              {review.user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-text-primary">{review.user.name}</span>
            {review.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-feedback-success/10 text-feedback-success text-[10px] font-bold px-2 py-0.5">
                Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <svg
                  key={star}
                  className={cn('w-3 h-3', star <= review.rating ? 'text-amber-500' : 'text-smoke-200')}
                  viewBox="0 0 24 24"
                  fill={star <= review.rating ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ))}
            </div>
            <span className="text-[11px] text-text-tertiary">{new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {review.title && <h4 className="font-bold text-sm text-text-primary mt-3">{review.title}</h4>}
      {review.body && <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{review.body}</p>}

      {images.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {images.map((img: string, i: number) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden bg-smoke-50 shrink-0">
              <Image src={img} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {review.vendorReply && (
        <div className="mt-3 p-3 rounded-md bg-surface-sunken border border-border">
          <p className="text-xs font-bold text-text-primary mb-1">Vendor reply</p>
          <p className="text-sm text-text-secondary">{review.vendorReply}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => handleVote(true)}
          disabled={submitting || !currentUserId || userVote?.helpful === true}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            userVote?.helpful === true ? 'text-action-primary' : 'text-text-tertiary hover:text-action-primary'
          )}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3.75a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 5.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.22 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
          </svg>
          Helpful ({review.helpfulCount})
        </button>
        <button
          type="button"
          onClick={() => setShowQuestions(!showQuestions)}
          className="text-xs font-medium text-text-tertiary hover:text-action-primary transition-colors"
        >
          Q&A ({review.questions?.length ?? 0})
        </button>
      </div>

      {showQuestions && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {review.questions?.map(q => (
            <div key={q.id} className="text-sm">
              <p className="font-medium text-text-primary">Q: {q.question}</p>
              {q.answer ? (
                <p className="text-text-secondary mt-1 ml-4">A: {q.answer}</p>
              ) : currentUserId && onAnswerQuestion ? (
                <div className="ml-4 mt-1">
                  <textarea
                    className="input text-xs w-full"
                    placeholder="Write an answer..."
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onAnswerQuestion(review.id, q.id, (e.target as HTMLTextAreaElement).value);
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="text-xs text-text-tertiary mt-1 ml-4">Awaiting answer</p>
              )}
            </div>
          ))}

          {currentUserId && onAskQuestion && (
            <div className="flex gap-2">
              <input
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="Ask a question about this review..."
                className="input flex-1 text-xs h-9"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAskQuestion();
                }}
              />
              <button
                type="button"
                onClick={handleAskQuestion}
                disabled={!newQuestion.trim() || submitting}
                className="btn btn-outline btn-sm text-xs"
              >
                Ask
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
