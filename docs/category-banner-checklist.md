# Category Banner Generation Checklist

## Status: ⏳ Waiting for Azure `gpt-image-1` access approval

## Steps

- [ ] Register at https://aka.ms/oai/access
- [ ] Wait for approval (1-2 business days)
- [ ] Deploy `gpt-image-1` to `storegrill-openai-global`
- [ ] Run generation script: `npx tsx apps/api/scripts/generate-category-banners.ts`
- [ ] Verify images in `apps/api/public/banners/category/`
- [ ] Update `CategoryQuickNav` component to use banner images
- [ ] Commit and deploy

## Prompts (11 categories, square 1:1 format)

| Order | Category | Tagline |
|-------|----------|---------|
| 1 | furniture | Beds, desks, dining and living pieces for every room in the house. |
| 2 | outdoor | Grills, patio furniture and garden gear made for the outdoors. |
| 3 | toys-hobbies | Play, learning and creative hobbies for kids of all ages. |
| 4 | baby-kids | Nurseries, toys and everyday essentials for growing families. |
| 5 | decor | Mirrors, lighting and accents that give every room its character. |
| 6 | pets | Beds, feeders and supplies your cat, dog or small pet will love. |
| 7 | sports | Exercise machines, yoga and gear for every kind of active day. |
| 8 | bath | Cabinets, storage and fixtures to keep every washroom organised. |
| 9 | appliances | Upgrade your home with the essentials that actually do the work. |
| 10 | kitchen | Cookware, organisers and storage for a kitchen that works. |
| 11 | health-beauty | Wellness, massage and self-care for home and on the go. |

## Generation Details

- **Model**: `gpt-image-1` via Azure OpenAI (`storegrill-openai-global`)
- **Size**: 1024x1024 (square, cropped to 316x420 card ratio)
- **Output**: `apps/api/public/banners/category/{category}.png`
- **Script**: `apps/api/scripts/generate-category-banners.ts`
- **Prompts also in**: `apps/admin/src/app/creative-studio/page.tsx` (Creative Studio CATEGORY_BANNER presets)

## Files Modified for Banner Feature

- `apps/admin/src/app/creative-studio/page.tsx` — 11 prompts added, square default
- `apps/api/scripts/generate-category-banners.ts` — Generation script (new)
- `apps/api/src/services/image-generation.ts` — Image service (existing)
- `apps/api/src/routes/creative.ts` — Creative API routes (existing)
- `apps/web/src/components/home/AmazonHomeGrid.tsx` — Hero carousel (316x420px cards)
