import { Router, Response, Request } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
  });

  res.json({ brands });
});

export { router as brandsRouter };
