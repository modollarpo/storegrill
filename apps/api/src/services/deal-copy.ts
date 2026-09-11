import { logAIRequest } from './ai-gateway.js';

export interface DealFacts {
  name: string;
  type: string;
  valueLabel: string;
  regionName: string;
  currencyCode: string;
  windowLabel: string;
  endsLabel: string;
  vendorName?: string;
  productNames: string[];
  language: string;
  userId?: string;
}

export interface DealCopySet {
  headline: string;
  subheadline: string;
  hook: string;
  urgency: string;
  cta: string;
}

export interface DealCopyResult {
  copy: DealCopySet;
  modelProvider: string;
  modelId: string;
}

export async function generateDealCopy(facts: DealFacts): Promise<DealCopyResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  if (!apiKey) {
    const copy = fallbackCopy(facts);
    return { copy, modelProvider: 'none', modelId: 'fallback' };
  }

  const startTime = Date.now();
  const systemPrompt =
    'You are a senior e-commerce promotion copywriter for a grocery and home-goods marketplace. ' +
    'Write short, conversion-focused promotional copy in the language whose ISO 639-1 code is ' +
    quotes(facts.language) + '. Respond with JSON only using exactly these keys: ' +
    '"headline" (max 40 characters), "subheadline" (max 70 characters), "hook" (1 sentence, max 120 characters), ' +
    '"urgency" (one short time-pressure line, max 60 characters), "cta" (max 12 characters). ' +
    'Never invent numbers: reuse the supplied discount, price and date facts verbatim. ' +
    'Do not compute or round any amounts yourself. Never claim free shipping unless it is stated in the facts. ' +
    'Stay honest and within the facts provided.';

  const productMention = facts.productNames.length > 0
    ? 'Products on deal (first few): ' + facts.productNames.slice(0, 3).join(', ') + '.'
    : '';

  const userPrompt = [
    'Deal facts (source of truth, use verbatim):',
    `- Name: ${facts.name}`,
    `- Offer: ${facts.valueLabel}`,
    `- Window: ${facts.windowLabel}`,
    `- Ends: ${facts.endsLabel}`,
    `- Region: ${facts.regionName}`,
    `- Currency: ${facts.currencyCode}`,
    `- Vendor: ${facts.vendorName ?? 'Storegrill'}`,
    productMention ? `- ${productMention}` : '',
  ].filter(Boolean).join('\n');

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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  });

  const latencyMs = Date.now() - startTime;
  let inputTokens = 0;
  let outputTokens = 0;
  let status: 'SUCCESS' | 'ERROR' = 'SUCCESS';
  let errorMessage: string | undefined;

  if (!response.ok) {
    status = 'ERROR';
    errorMessage = `HTTP ${response.status}: ${await response.text()}`;
    await logAIRequest({
      userId: facts.userId,
      purpose: 'DEAL_COPY',
      modelProvider: endpoint ? 'azure' : 'openai',
      modelId: deploymentName,
      inputTokens,
      outputTokens,
      latencyMs,
      status,
      errorMessage,
    });
    const copy = fallbackCopy(facts);
    return { copy, modelProvider: endpoint ? 'azure' : 'openai', modelId: deploymentName };
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  inputTokens = data.usage?.prompt_tokens ?? 0;
  outputTokens = data.usage?.completion_tokens ?? 0;

  await logAIRequest({
    userId: facts.userId,
    purpose: 'DEAL_COPY',
    modelProvider: endpoint ? 'azure' : 'openai',
    modelId: deploymentName,
    inputTokens,
    outputTokens,
    latencyMs,
    status,
  });

  const content = data.choices?.[0]?.message?.content;
  const parsed = parseCopy(content);
  const copy: DealCopySet = {
    headline: parsed.headline ?? fallbackCopy(facts).headline,
    subheadline: parsed.subheadline ?? fallbackCopy(facts).subheadline,
    hook: parsed.hook ?? fallbackCopy(facts).hook,
    urgency: parsed.urgency ?? fallbackCopy(facts).urgency,
    cta: parsed.cta ?? fallbackCopy(facts).cta,
  };

  return { copy, modelProvider: endpoint ? 'azure' : 'openai', modelId: deploymentName };
}

function quotes(value: string): string {
  return `"${value}"`;
}

function parseCopy(content: string | undefined): Partial<DealCopySet> {
  if (!content) return {};
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const obj = parsed as Record<string, unknown>;
    const out: Partial<DealCopySet> = {};
    for (const key of ['headline', 'subheadline', 'hook', 'urgency', 'cta'] as const) {
      if (typeof obj[key] === 'string') out[key] = obj[key];
    }
    return out;
  } catch {
    return {};
  }
}

function fallbackCopy(facts: DealFacts): DealCopySet {
  return {
    headline: `${facts.valueLabel} on ${facts.name}`.slice(0, 40),
    subheadline: `Shop the ${facts.name} offer before it ends.`,
    hook: `Get ${facts.valueLabel} on ${facts.name} across the ${facts.regionName} store until ${facts.endsLabel}.`,
    urgency: `Ends ${facts.endsLabel}`,
    cta: 'Shop deal',
  };
}