import { logAIRequest, getModelConfig } from './ai-gateway.js';

export interface AiRewriteInput {
  title: string;
  description: string;
  sourceFacts: string[];
}

export interface AiRewriteResult {
  rewrittenTitle: string;
  rewrittenDescription: string;
  validated: boolean;
  confidence: number;
  modelUsed?: string;
  cached?: boolean;
}

const SYSTEM_PROMPT = `You are a product content editor for an e-commerce marketplace.
Rewrite product titles and descriptions to be clear, accurate, and compelling.
Maintain all factual information from the source.
Do not add information not present in the source.
Return JSON with: { "title": "...", "description": "..." }`;

function buildUserPrompt(input: AiRewriteInput): string {
  return `Rewrite this product content:

Title: ${input.title}
Description: ${input.description}

Source facts to preserve:
${input.sourceFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Return JSON with the rewritten title and description.`;
}

function parseAIResponse(text: string): { title: string; description: string } | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.title === 'string' && typeof parsed.description === 'string') {
      return { title: parsed.title, description: parsed.description };
    }
    return null;
  } catch {
    return null;
  }
}

function validateFacts(title: string, description: string, facts: string[]): boolean {
  const text = (title + ' ' + description).toLowerCase();
  return facts.every(fact => text.includes(fact.toLowerCase()));
}

function fallbackRewrite(input: AiRewriteInput): AiRewriteResult {
  const rewrittenTitle = input.title.trim();
  const rewrittenDescription = input.description.trim();
  const validated = validateFacts(rewrittenTitle, rewrittenDescription, input.sourceFacts);
  return {
    rewrittenTitle,
    rewrittenDescription,
    validated,
    confidence: validated ? 0.75 : 0.5,
    modelUsed: 'fallback',
    cached: false,
  };
}

export async function rewriteProductContent(
  input: AiRewriteInput,
  userId?: string,
): Promise<AiRewriteResult> {
  const isEnabled = process.env.AI_MERCHANDISING_ENABLED !== 'false';
  if (!isEnabled) {
    throw new Error('AI merchandising service is disabled');
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    return fallbackRewrite(input);
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  const provider = process.env.AI_PROVIDER || (endpoint ? 'azure' : 'openai');
  const modelId = process.env.AI_MODEL || (endpoint ? deploymentName : 'gpt-4o-mini');
  const modelConfig = await getModelConfig(provider, modelId);

  if (!modelConfig) {
    return fallbackRewrite(input);
  }

  const startTime = Date.now();
  const url = endpoint
    ? `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`
    : 'https://api.openai.com/v1/chat/completions';
  const headers: Record<string, string> = endpoint
    ? { 'api-key': apiKey, 'Content-Type': 'application/json' }
    : { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: endpoint ? undefined : modelId,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      await logAIRequest({
        userId,
        purpose: 'REWRITE',
        modelProvider: provider,
        modelId,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        status: 'ERROR',
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      return fallbackRewrite(input);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage;

    if (!content) {
      await logAIRequest({
        userId,
        purpose: 'REWRITE',
        modelProvider: provider,
        modelId,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        latencyMs,
        status: 'ERROR',
        errorMessage: 'Empty response from AI',
      });
      return fallbackRewrite(input);
    }

    const parsed = parseAIResponse(content);
    if (!parsed) {
      await logAIRequest({
        userId,
        purpose: 'REWRITE',
        modelProvider: provider,
        modelId,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        latencyMs,
        status: 'ERROR',
        errorMessage: 'Failed to parse AI response',
      });
      return fallbackRewrite(input);
    }

    const validated = validateFacts(parsed.title, parsed.description, input.sourceFacts);

    await logAIRequest({
      userId,
      purpose: 'REWRITE',
      modelProvider: provider,
      modelId,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      latencyMs,
      status: 'SUCCESS',
      metadata: { validated, confidence: validated ? 0.99 : 0.85 },
    });

    return {
      rewrittenTitle: parsed.title,
      rewrittenDescription: parsed.description,
      validated,
      confidence: validated ? 0.99 : 0.85,
      modelUsed: `${provider}/${modelId}`,
      cached: false,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    await logAIRequest({
      userId,
      purpose: 'REWRITE',
      modelProvider: provider,
      modelId,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: 'ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return fallbackRewrite(input);
  }
}
