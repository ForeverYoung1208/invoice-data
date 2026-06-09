import { OpenAICompatibleAdapter } from '../../../src/lib/llm/OpenAICompatibleAdapter';
import { LlmAdapter } from '../../../src/lib/llm/LlmAdapter';

// Placeholder values from .env.example — treat as "not configured"
const PLACEHOLDER_API_KEY = 'your-litellm-api-key';

const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = process.env;

const isLive =
  Boolean(LLM_API_KEY) &&
  LLM_API_KEY !== PLACEHOLDER_API_KEY &&
  Boolean(LLM_BASE_URL) &&
  Boolean(LLM_MODEL);

class StubAdapter extends LlmAdapter {
  generate() {
    return Promise.resolve({
      content: 'pong',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
  }
  generateJson<T>() {
    return Promise.resolve({ value: 42 } as T);
  }
}

describe('LLM adapter — integration', () => {
  let adapter: LlmAdapter;

  beforeAll(() => {
    if (isLive) {
      console.log(
        `[LLM integration] LIVE — ${LLM_BASE_URL}, model: ${LLM_MODEL}`,
      );
      adapter = new OpenAICompatibleAdapter({
        baseUrl: LLM_BASE_URL!,
        apiKey: LLM_API_KEY!,
        model: LLM_MODEL!,
      });
    } else {
      console.log(
        '[LLM integration] MOCK — env vars absent or contain placeholder values',
      );
      adapter = new StubAdapter();
    }
  });

  it('generate() returns a non-empty text response', async () => {
    const result = await adapter.generate([
      { role: 'user', content: 'Reply with the single word: pong' },
    ]);

    expect(typeof result.content).toBe('string');
    expect(result.content.trim().length).toBeGreaterThan(0);
    console.log('[LLM integration] generate():', result.content.trim());
  }, 30_000);

  it('generateJson() returns a parsed object with expected shape', async () => {
    const result = await adapter.generateJson<{ value: number }>([
      { role: 'system', content: 'Return ONLY raw JSON, no markdown.' },
      { role: 'user', content: 'Return this exact JSON: {"value": 42}' },
    ]);

    expect(result).toHaveProperty('value');
    expect(typeof result.value).toBe('number');
    console.log('[LLM integration] generateJson():', result);
  }, 30_000);
});
