import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { tickFeedWarmer } from './scheduler.js';
import { buildFeed } from './feed-builder.js';

vi.mock('./feed-builder.js', () => ({
  buildFeed: vi.fn(),
  loadFeedItems: vi.fn().mockResolvedValue([]),
  renderGoogleMerchant: vi.fn().mockReturnValue(''),
  renderFacebookCsv: vi.fn().mockReturnValue(''),
  renderTikTokCsv: vi.fn().mockReturnValue(''),
  renderPinterestCsv: vi.fn().mockReturnValue(''),
  FeedChannel: undefined,
}));

const buildFeedMock = buildFeed as unknown as ReturnType<typeof vi.fn>;

function stubPrisma(regionKeys: string[]) {
  return {
    productRegionPrice: {
      findMany: vi.fn(async () => regionKeys.map(regionKey => ({ regionKey }))),
    },
  } as unknown as PrismaClient;
}

describe('tickFeedWarmer', () => {
  beforeEach(() => {
    buildFeedMock.mockReset();
    buildFeedMock.mockResolvedValue('seed');
  });

  it('warms all four channels for each region that has priced products', async () => {
    await tickFeedWarmer(stubPrisma(['UK', 'US']));

    expect(buildFeedMock).toHaveBeenCalledTimes(8);
    expect(buildFeedMock).toHaveBeenCalledWith('UK', 'google-merchant');
    expect(buildFeedMock).toHaveBeenCalledWith('UK', 'facebook');
    expect(buildFeedMock).toHaveBeenCalledWith('US', 'google-merchant');
    expect(buildFeedMock).toHaveBeenCalledWith('US', 'pinterest');
  });

  it('skips regions not present in DEFAULT_REGIONS', async () => {
    await tickFeedWarmer(stubPrisma(['UK', 'ZZ']));

    expect(buildFeedMock).toHaveBeenCalledTimes(4);
    expect(buildFeedMock).not.toHaveBeenCalledWith('ZZ', 'google-merchant');
  });

  it('skips entirely when no priced regions exist (e.g. empty AE/NG pods)', async () => {
    await tickFeedWarmer(stubPrisma([]));

    expect(buildFeedMock).not.toHaveBeenCalled();
  });

  it('keeps warming other channels when one build fails', async () => {
    buildFeedMock.mockImplementation(async (regionKey: string, channel: string) => {
      if (regionKey === 'UK' && channel === 'tiktok') throw new Error('boom');
      return 'seed';
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await tickFeedWarmer(stubPrisma(['UK']));

    expect(buildFeedMock).toHaveBeenCalledTimes(4);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('[feed-warmer] UK/tiktok failed:'), 'boom');
    consoleError.mockRestore();
  });
});