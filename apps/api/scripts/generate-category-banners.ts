/**
 * Generate StoreGrill category banner images for the hero carousel.
 *
 * Run: npx tsx apps/api/scripts/generate-category-banners.ts
 *
 * Requires: AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_KEY in env
 */

import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://storegrill-openai-images-76202.openai.azure.com/';
const AZURE_KEY = process.env.AZURE_OPENAI_KEY;
const API_VERSION = '2024-12-01-preview';

if (!AZURE_KEY) {
  console.error('ERROR: AZURE_OPENAI_KEY not set in environment');
  process.exit(1);
}

const CATEGORY_PROMPTS: Array<{
  category: string;
  displayOrder: number;
  tagline: string;
  prompt: string;
}> = [
  {
    category: 'furniture',
    displayOrder: 1,
    tagline: 'Beds, desks, dining and living pieces for every room in the house.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Three pieces of modern furniture arranged in a lifestyle grouping: a mid-century modern bed with neutral bedding, a wooden dining table with four chairs, and a contemporary sofa in light gray fabric. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. High-end furniture catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'outdoor',
    displayOrder: 2,
    tagline: 'Grills, patio furniture and garden gear made for the outdoors.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Outdoor living products arranged in a grouping: a stainless steel gas grill, a rattan patio furniture set with cushions, a large patio umbrella, and garden planters. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Outdoor living catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'toys-hobbies',
    displayOrder: 3,
    tagline: 'Play, learning and creative hobbies for kids of all ages.',
    prompt: "A professional e-commerce product photography composition on a clean white background. Children's toys and hobbies arranged in a playful grouping: a colorful trampoline, a ride-on electric car for kids, building blocks set, and an art easel. Soft studio lighting, vibrant colors, subtle shadows, no text, no people. Amazon hero carousel card style. Kids toy catalog aesthetic. Square format, 1:1 aspect ratio.",
  },
  {
    category: 'baby-kids',
    displayOrder: 4,
    tagline: 'Nurseries, toys and everyday essentials for growing families.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Baby and nursery products arranged in a gentle grouping: a wooden crib with white bedding, a baby stroller in modern design, a high chair, and a baby rocker. Soft pastel tones, soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Baby nursery catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'decor',
    displayOrder: 5,
    tagline: 'Mirrors, lighting and accents that give every room its character.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Home decor accents arranged in an elegant grouping: a large decorative wall mirror, a modern floor lamp, a stylish area rug, and faux potted plants. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Home decor catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'pets',
    displayOrder: 6,
    tagline: 'Beds, feeders and supplies your cat, dog or small pet will love.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Pet supplies arranged in a friendly grouping: a modern dog bed, a cat tree tower, pet food bowls on a stand, and a small animal cage. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Pet supplies catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'sports',
    displayOrder: 7,
    tagline: 'Exercise machines, yoga and gear for every kind of active day.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Fitness and sports equipment arranged in an active grouping: a compact treadmill, an exercise bike, a set of dumbbells on a rack, and a yoga mat with blocks. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Sports equipment catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'bath',
    displayOrder: 8,
    tagline: 'Cabinets, storage and fixtures to keep every washroom organised.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Bathroom organization products arranged in a clean grouping: a wall-mounted bathroom cabinet, a towel rack, a laundry basket, and an over-the-toilet storage shelf. Soft studio lighting, clean aesthetic, subtle shadows, no text, no people. Amazon hero carousel card style. Bathroom storage catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'appliances',
    displayOrder: 9,
    tagline: 'Upgrade your home with the essentials that actually do the work.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Home appliances arranged in a modern grouping: a compact air purifier, a mini fridge, a standing fan, and a small kitchen appliance like a blender. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Home appliance catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'kitchen',
    displayOrder: 10,
    tagline: 'Cookware, organisers and storage for a kitchen that works.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Kitchen products arranged in a functional grouping: a cookware set with pots and pans, a dish drying rack, a kitchen trash can, and a wine rack. Soft studio lighting, subtle shadows, no text, no people. Amazon hero carousel card style. Kitchen products catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
  {
    category: 'health-beauty',
    displayOrder: 11,
    tagline: 'Wellness, massage and self-care for home and on the go.',
    prompt: 'A professional e-commerce product photography composition on a clean white background. Health and wellness products arranged in a relaxing grouping: a massage chair, a foot massager, a spa salon stool, and wellness accessories. Soft studio lighting, calming tones, subtle shadows, no text, no people. Amazon hero carousel card style. Health and beauty catalog aesthetic. Square format, 1:1 aspect ratio.',
  },
];

async function generateImage(prompt: string, retries = 3): Promise<{ url: string; b64Json: string; revisedPrompt?: string }> {
  const url = `${AZURE_ENDPOINT}openai/deployments/gpt-image-2/images/generations?api-version=${API_VERSION}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': AZURE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'high',
        }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '30', 10);
        console.log(`rate limited, waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

  const data = await response.json() as {
    data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };

  const imageData = data.data?.[0];
  if (!imageData?.url && !imageData?.b64_json) {
    throw new Error('No image data in response');
  }

  return {
    url: imageData.url || '',
    b64Json: imageData.b64_json || '',
    revisedPrompt: imageData.revised_prompt,
  };
  } catch (error) {
    if (attempt === retries) throw error;
    console.log(`attempt ${attempt} failed, retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
  }
  }
  throw new Error('All retries exhausted');
}

async function main() {
  const outputDir = join(process.cwd(), 'public', 'banners', 'category');
  await mkdir(outputDir, { recursive: true });

  console.log('Generating StoreGrill category banner images...\n');
  console.log(`Output: ${outputDir}\n`);

  const results: Array<{ category: string; order: number; url: string; localPath: string }> = [];

  for (const cat of CATEGORY_PROMPTS) {
    const filename = `${cat.category}.png`;
    const localPath = join(outputDir, filename);
    
    // Skip if already generated
    try {
      const stat = await import('node:fs').then(fs => fs.statSync(localPath));
      if (stat.size > 0) {
        console.log(`[${cat.displayOrder}/11] ${cat.category}... skipped (exists)`);
        results.push({
          category: cat.category,
          order: cat.displayOrder,
          url: '',
          localPath: `public/banners/category/${filename}`,
        });
        continue;
      }
    } catch {}
    
    process.stdout.write(`[${cat.displayOrder}/11] ${cat.category}... `);

    try {
      const result = await generateImage(cat.prompt);

      const filename = `${cat.category}.png`;
      const localPath = join(outputDir, filename);

      // Download and save locally
      if (result.url) {
        const imgResponse = await fetch(result.url);
        const buffer = await imgResponse.arrayBuffer();
        await writeFile(localPath, Buffer.from(buffer));
      } else if (result.b64Json) {
        await writeFile(localPath, Buffer.from(result.b64Json, 'base64'));
      }

      results.push({
        category: cat.category,
        order: cat.displayOrder,
        url: result.url,
        localPath: `public/banners/category/${filename}`,
      });

      console.log(`done`);
      if (result.revisedPrompt) {
        console.log(`  -> ${result.revisedPrompt.slice(0, 100)}...`);
      }
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : error}`);
    }

    // Rate limit: wait 10s between requests
    if (cat.displayOrder < CATEGORY_PROMPTS.length) {
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // Generate summary JSON
  const summary = {
    generatedAt: new Date().toISOString(),
    banners: results.map(r => ({
      category: r.category,
      displayOrder: r.order,
      localPath: r.localPath,
      cdnUrl: r.url,
    })),
  };

  const summaryPath = join(outputDir, '_manifest.json');
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done! ${results.length}/${CATEGORY_PROMPTS.length} banners generated.`);
  console.log(`Manifest: ${summaryPath}`);
  console.log(`${'='.repeat(60)}\n`);

  // Print table
  console.log('Category Banners Summary:\n');
  console.log('Order | Category        | File');
  console.log('------|-----------------|------');
  for (const r of results) {
    console.log(`  ${String(r.order).padStart(2)}  | ${r.category.padEnd(15)} | ${r.localPath}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
