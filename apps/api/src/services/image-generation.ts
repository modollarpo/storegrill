import { logAIRequest } from './ai-gateway.js';

export interface GenerateImageInput {
  prompt: string;
  size: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
  purpose: 'HERO_BANNER' | 'DEAL_BANNER' | 'CATEGORY_BANNER' | 'AD_BANNER' | 'SOCIAL_MEDIA' | 'PRODUCT_HERO';
  regionKey?: string;
  userId?: string;
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt?: string;
  modelUsed: string;
  cached?: boolean;
}

const ART_DIRECTION_BASE =
  'Master-level print advertising art direction. Editorial composition with a clear visual hierarchy, generous negative space, directional lighting, and a restrained premium palette of deep charcoal, warm cream, and a single ember-oxide accent. No text, no logos, no watermarks, no icons, no captions, no barcodes — copy and buttons are overlaid separately by the storefront. Studio-grade commercial photography, subtle film grain, high-end retail campaign quality.';

const STYLE_PROMPTS: Record<string, string> = {
  'HERO_BANNER': `${ART_DIRECTION_BASE} Wide 16:9 campaign hero. Signature subject positioned on the right two-thirds, uncluttered calm space reserved on the left third for headline and call-to-action overlay. Medium-format camera look, shallow depth of field, cinematic color grading.`,
  'DEAL_BANNER': `${ART_DIRECTION_BASE} Wide 16:9 promotion hero. One hero product lit sculpturally against a quiet charcoal backdrop with a soft ember under-glow, calm negative space on the left for price and offer overlay. Premium discount campaign, no clutter, no starbursts.`,
  'CATEGORY_BANNER': `${ART_DIRECTION_BASE} Square category card. Curated 3-4 piece product arrangement styled as a designer showroom vignette on a soft cream backdrop, gentle cross-lighting and short shadows, generous quiet margin around the group for overlay copy.`,
  'AD_BANNER': `${ART_DIRECTION_BASE} Square digital display creative. Single dominant subject with a bold, confident silhouette, strong tonal contrast, and an open upper copy zone. High-impact yet restrained, brand matte finish.`,
  'SOCIAL_MEDIA': `${ART_DIRECTION_BASE} Editorial lifestyle frame. Authentic premium lifestyle moment with natural window light, considered styling, and calm negative space for overlay text. Shot on 50mm, intentional focus fall-off.`,
  'PRODUCT_HERO': `${ART_DIRECTION_BASE} Studio product hero. Sculptural rim-lighting on a seamless warm-grey or cream backdrop, soft reflection, sharp detail on the product with gentle fall-off into shadow.`,
};

export async function generateBannerImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const deploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3';

  if (!apiKey) {
    throw new Error('Azure OpenAI API key not configured');
  }

  const styleContext = STYLE_PROMPTS[input.purpose] || '';
  const fullPrompt = `${styleContext}\n\n${input.prompt}`.trim();

  const startTime = Date.now();

  let url: string;
  let headers: Record<string, string>;

  if (endpoint) {
    // Azure OpenAI
    url = `${endpoint}/openai/deployments/${deploymentName}/images/generations?api-version=${apiVersion}`;
    headers = {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    };
  } else {
    // Direct OpenAI
    url = 'https://api.openai.com/v1/images/generations';
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: endpoint ? undefined : 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: input.size,
      style: input.style || 'vivid',
      quality: input.quality || 'hd',
      response_format: 'url',
    }),
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errorBody = await response.text();
    await logAIRequest({
      userId: input.userId,
      purpose: 'IMAGE_GENERATION',
      modelProvider: endpoint ? 'azure' : 'openai',
      modelId: deploymentName,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: 'ERROR',
      errorMessage: `HTTP ${response.status}: ${errorBody}`,
    });
    throw new Error(`Image generation failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json() as {
    data?: Array<{ url?: string; revised_prompt?: string }>;
  };

  const imageData = data.data?.[0];
  if (!imageData?.url) {
    await logAIRequest({
      userId: input.userId,
      purpose: 'IMAGE_GENERATION',
      modelProvider: endpoint ? 'azure' : 'openai',
      modelId: deploymentName,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: 'ERROR',
      errorMessage: 'No image URL in response',
    });
    throw new Error('No image URL in response');
  }

  await logAIRequest({
    userId: input.userId,
    purpose: 'IMAGE_GENERATION',
    modelProvider: endpoint ? 'azure' : 'openai',
    modelId: deploymentName,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs,
    status: 'SUCCESS',
    metadata: {
      purpose: input.purpose,
      size: input.size,
      style: input.style,
      revisedPrompt: imageData.revised_prompt,
    },
  });

  return {
    url: imageData.url,
    revisedPrompt: imageData.revised_prompt,
    modelUsed: `${endpoint ? 'azure' : 'openai'}/${deploymentName}`,
  };
}

export async function enhanceProductImage(
  productTitle: string,
  productDescription: string,
  style: 'lifestyle' | 'studio' | 'contextual' = 'lifestyle',
): Promise<GenerateImageResult> {
  const stylePrompts = {
    lifestyle: `Lifestyle product photography: ${productTitle}. ${productDescription}. Show the product in a real-life setting, warm natural lighting, aspirational lifestyle.`,
    studio: `Studio product photography: ${productTitle}. ${productDescription}. Clean white background, professional studio lighting, e-commerce ready.`,
    contextual: `Contextual product shot: ${productTitle}. ${productDescription}. Show the product being used, action shot, dynamic composition.`,
  };

  return generateBannerImage({
    prompt: stylePrompts[style],
    size: '1024x1024',
    style: 'natural',
    quality: 'hd',
    purpose: 'PRODUCT_HERO',
  });
}

export async function generateAdCopy(
  productTitle: string,
  productPrice: string,
  discount?: string,
  platform: 'google' | 'facebook' | 'instagram' = 'google',
): Promise<{ headline: string; description: string; cta: string }> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      headline: `${productTitle} - ${discount ? discount + ' OFF' : 'Shop Now'}`,
      description: `Get ${productTitle} for ${productPrice}. Limited time offer.`,
      cta: 'Shop Now',
    };
  }

  let url: string;
  let headers: Record<string, string>;

  if (endpoint) {
    url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: endpoint ? undefined : deploymentName,
      messages: [
        {
          role: 'system',
          content: `You are a ${platform} ad copywriter for an e-commerce marketplace. Return JSON with: { "headline": "...", "description": "...", "cta": "..." }. Headline max 30 chars, description max 90 chars, CTA max 10 chars.`,
        },
        {
          role: 'user',
          content: `Write ad copy for: ${productTitle} priced at ${productPrice}${discount ? ` with discount ${discount}` : ''}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content || '{}');
    return {
      headline: parsed.headline || `${productTitle} - Shop Now`,
      description: parsed.description || `Get ${productTitle} for ${productPrice}`,
      cta: parsed.cta || 'Shop Now',
    };
  } catch {
    return {
      headline: `${productTitle} - Shop Now`,
      description: `Get ${productTitle} for ${productPrice}`,
      cta: 'Shop Now',
    };
  }
}
