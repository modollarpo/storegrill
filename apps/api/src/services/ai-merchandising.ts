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
}

export function rewriteProductContent(input: AiRewriteInput): AiRewriteResult {
  const isEnabled = process.env.AI_MERCHANDISING_ENABLED !== 'false'; // default enabled for prototype testing unless explicitly 'false'
  if (!isEnabled) {
    throw new Error('AI merchandising service is disabled');
  }

  const rewrittenTitle = input.title.trim();
  const rewrittenDescription = input.description.trim();

  const lowerText = (rewrittenTitle + ' ' + rewrittenDescription).toLowerCase();
  const validated = input.sourceFacts.every((fact: string) => lowerText.includes(fact.toLowerCase()));

  return {
    rewrittenTitle,
    rewrittenDescription,
    validated,
    confidence: validated ? 0.99 : 0.75,
  };
}
