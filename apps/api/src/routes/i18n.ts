import { Router, Response } from 'express';
import { z } from 'zod';
import { translateBatch } from '../services/translate.js';

const router = Router();

const BodySchema = z.object({
  texts: z.array(z.string().max(5000)).min(1).max(100),
  sourceLang: z.string().length(2).default('en'),
  targetLang: z.string().length(2),
});

router.post('/translate', async (req, res) => {
  const body = BodySchema.parse(req.body);
  const result = await translateBatch(body.texts, body.sourceLang, body.targetLang);
  res.json({
    translations: result.translations,
    targetLang: body.targetLang,
    providerUsed: result.providerUsed,
  });
});

export { router as i18nRouter };
