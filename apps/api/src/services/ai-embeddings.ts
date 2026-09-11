import { logAIRequest } from './ai-gateway.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  vector: number[];
  provider: string;
  modelId: string;
  latencyMs: number;
  inputTokens: number;
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
}

export async function getEmbedding(text: string, userId?: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI API key configured for embeddings');

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const deploymentName = process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT || EMBEDDING_MODEL;

  let url: string;
  let headers: Record<string, string>;
  let provider: string;
  let modelId: string;
  let body: string;

  if (endpoint) {
    url = `${endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=${apiVersion}`;
    headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
    provider = 'azure';
    modelId = deploymentName;
    body = JSON.stringify({ input: text, dimensions: EMBEDDING_DIMENSIONS });
  } else {
    url = 'https://api.openai.com/v1/embeddings';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    provider = 'openai';
    modelId = EMBEDDING_MODEL;
    body = JSON.stringify({ input: text, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS });
  }

  const startTime = Date.now();
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers, body });
  } catch (error) {
    await logError(userId, provider, modelId, startTime, error);
    throw error instanceof Error ? error : new Error('Embedding request failed');
  }
  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    await logAIRequest({
      userId,
      purpose: 'EMBED',
      modelProvider: provider,
      modelId,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: 'ERROR',
      errorMessage: `HTTP ${response.status}: ${detail.slice(0, 200)}`,
    });
    throw new Error(`Embedding request failed with HTTP ${response.status}`);
  }

  const data = await response.json() as {
    data?: Array<{ embedding?: number[] }>;
    usage?: { total_tokens?: number };
  };

  const vector = data.data?.[0]?.embedding;
  if (!vector || vector.length === 0) {
    await logError(userId, provider, modelId, startTime, new Error('Embedding response missing vector'));
    throw new Error('Embedding response missing vector');
  }

  const inputTokens = data.usage?.total_tokens ?? 0;
  await logAIRequest({
    userId,
    purpose: 'EMBED',
    modelProvider: provider,
    modelId,
    inputTokens,
    outputTokens: 0,
    latencyMs,
    status: 'SUCCESS',
  });

  return { vector, provider, modelId, latencyMs, inputTokens };
}

async function logError(
  userId: string | undefined,
  provider: string,
  modelId: string,
  startTime: number,
  error: unknown,
): Promise<void> {
  await logAIRequest({
    userId,
    purpose: 'EMBED',
    modelProvider: provider,
    modelId,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    status: 'ERROR',
    errorMessage: error instanceof Error ? error.message : 'Unknown error',
  });
}