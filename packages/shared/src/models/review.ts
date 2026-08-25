import { z } from 'zod';

export const ReviewStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const ReviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  images: z.array(z.string().url()).default([]),
  verified: z.boolean().default(false),
  vendorReply: z.string().max(2000).optional(),
  status: ReviewStatus.default('PENDING'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Review = z.infer<typeof ReviewSchema>;
export type ReviewStatusEnum = z.infer<typeof ReviewStatus>;

export const CreateReviewSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  images: z.array(z.string().url()).max(10).default([]),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  images: z.array(z.string().url()).max(10).optional(),
});
