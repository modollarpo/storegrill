import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const blogRouter = Router();

// GET /api/v1/blog — list published posts
blogRouter.get('/', async (req, res) => {
  const { category, tag, search, page = '1', limit = '12' } = req.query as Record<string, string>;
  const take = Math.min(Number(limit) || 12, 50);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where: Record<string, unknown> = { status: 'PUBLISHED' };
  if (category) where.category = { slug: category };
  if (tag) where.tags = { some: { tag: { slug: tag } } };
  if (search) where.title = { contains: search };

  const [total, posts] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: [{ featuredAt: 'desc' }, { publishedAt: 'desc' }],
      take,
      skip,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        coverImage: true, publishedAt: true, readTimeMinutes: true, viewCount: true,
        category: { select: { name: true, slug: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
        author: { select: { name: true, avatar: true } },
      },
    }),
  ]);

  res.json({ posts, total, page: Number(page), limit: take, pages: Math.ceil(total / take) });
});

// GET /api/v1/blog/categories
blogRouter.get('/categories', async (_req, res) => {
  const cats = await prisma.blogCategory.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: { where: { status: 'PUBLISHED' } } } } } });
  res.json(cats);
});

// GET /api/v1/blog/:slug — single post
blogRouter.get('/:slug', async (req, res) => {
  const post = await prisma.blogPost.findFirst({
    where: { slug: req.params.slug, status: 'PUBLISHED' },
    include: {
      category: true,
      tags: { include: { tag: true } },
      author: { select: { name: true, avatar: true } },
    },
  });
  if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
  // increment view
  prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  return res.json(post);
});

// POST /api/v1/blog — admin create post
blogRouter.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { title, slug, excerpt, body, coverImage, status = 'DRAFT', categoryId, tagIds = [], readTimeMinutes = 0 } = req.body;
  if (!title || !slug || !body) return res.status(400).json({ error: { message: 'title, slug, body required' } });
  const post = await prisma.blogPost.create({
    data: {
      title, slug, excerpt, body, coverImage, status, categoryId,
      readTimeMinutes,
      publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
      authorId: (req as any).user?.id,
      tags: tagIds.length ? { create: tagIds.map((tagId: string) => ({ tagId })) } : undefined,
    },
    include: { category: true, tags: { include: { tag: true } } },
  });
  return res.status(201).json(post);
});

// PATCH /api/v1/blog/:id — admin update
blogRouter.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { tagIds, ...data } = req.body;
  if (data.status === 'PUBLISHED' && !data.publishedAt) data.publishedAt = new Date();
  const post = await prisma.blogPost.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(tagIds !== undefined && {
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId: string) => ({ tagId })),
        },
      }),
    },
    include: { category: true, tags: { include: { tag: true } } },
  });
  return res.json(post);
});

// DELETE /api/v1/blog/:id
blogRouter.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  await prisma.blogPost.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});
