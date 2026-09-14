import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { buildFeed, FeedChannel } from '../services/feed-builder.js';
import { DEFAULT_REGIONS } from '@Storegrill/shared';

const router = Router();

const ChannelSchema = z.enum(['google-merchant', 'facebook', 'tiktok', 'pinterest']);

const CONTENT_TYPES: Record<FeedChannel, string> = {
  'google-merchant': 'application/xml; charset=utf-8',
  facebook: 'text/csv; charset=utf-8',
  tiktok: 'text/csv; charset=utf-8',
  pinterest: 'text/csv; charset=utf-8',
};

router.get('/:channel', async (req: AuthRequest, res: Response) => {
  const parsed = ChannelSchema.safeParse(req.params.channel);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'INVALID_CHANNEL',
        message: `Unknown feed channel "${req.params.channel}". Use google-merchant, facebook, tiktok, or pinterest.`,
        validChannels: ChannelSchema.options,
      },
    });
  }
  const channel = parsed.data as FeedChannel;

  const regionKeyRaw = (req.query.regionKey as string) || 'UK';
  const regionKey = String(regionKeyRaw).toUpperCase();
  const region = DEFAULT_REGIONS.find(r => r.key === regionKey);
  if (!region) {
    return res.status(400).json({
      error: { code: 'INVALID_REGION', message: `Unknown regionKey "${regionKey}".` },
    });
  }

  try {
    const feed = await buildFeed(regionKey, channel);
    res.setHeader('Content-Type', CONTENT_TYPES[channel]);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(feed);
  } catch (error) {
    console.error('Feed build failed:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: { code: 'FEED_BUILD_FAILED', message: 'Failed to build product feed.' },
    });
  }
});

export { router as feedsRouter };