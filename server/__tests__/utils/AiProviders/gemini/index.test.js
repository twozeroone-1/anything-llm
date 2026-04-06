/* eslint-env jest */

const mockChatCreate = jest.fn();

jest.mock(
  "openai",
  () => ({
    OpenAI: jest.fn().mockImplementation(({ apiKey }) => ({
      chat: {
        completions: {
          create: (payload) => mockChatCreate(apiKey, payload),
        },
      },
    })),
  }),
  { virtual: true }
);
jest.mock("../../../../utils/EmbeddingEngines/native", () => ({
  NativeEmbedder: class NativeEmbedder {
    async embedTextInput() {
      return [];
    }
    async embedChunks() {
      return [];
    }
  },
}));
jest.mock("../../../../utils/helpers/chat/LLMPerformanceMonitor", () => ({
  LLMPerformanceMonitor: {
    measureAsyncFunction: async (promise) => ({
      output: await promise,
      duration: 1,
    }),
    measureStream: jest.fn(async ({ func }) => await func),
  },
}));
jest.mock("../../../../utils/helpers/chat/responses", () => ({
  formatChatHistory: jest.fn((history = []) => history),
  handleDefaultStreamResponseV2: jest.fn(),
}));
jest.mock("../../../../utils/http", () => ({
  safeJsonParse: jest.fn(() => []),
}));
jest.mock("../../../../utils/AiProviders/modelMap", () => ({
  MODEL_MAP: new Map(),
}));

describe("GeminiLLM", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockChatCreate.mockReset();
    process.env = {
      ...originalEnv,
      GEMINI_API_KEYS: "bad-llm,good-llm",
      GEMINI_LLM_MODEL_PREF: "gemini-2.0-flash-lite",
    };
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("falls back to the next Gemini chat key after a retryable failure", async () => {
    mockChatCreate.mockImplementation(async (apiKey) => {
      if (apiKey === "bad-llm") {
        const error = new Error("quota exceeded");
        error.status = 429;
        throw error;
      }
      return {
        choices: [{ message: { content: "hello from fallback" } }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      };
    });

    const { GeminiLLM } = require("../../../../utils/AiProviders/gemini");
    const llm = new GeminiLLM({
      embedTextInput: jest.fn(),
      embedChunks: jest.fn(),
    });

    const response = await llm.getChatCompletion(
      [{ role: "user", content: "hi" }],
      {
        temperature: 0.7,
      }
    );

    expect(response.textResponse).toBe("hello from fallback");
    expect(mockChatCreate.mock.calls.map(([apiKey]) => apiKey)).toEqual([
      "bad-llm",
      "good-llm",
    ]);
    expect(process.env.GEMINI_API_KEY).toBe("good-llm");
  });

  test("includes Gemini output cap on non-stream chat requests when configured", async () => {
    process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS = "256";
    mockChatCreate.mockImplementation(async () => ({
      choices: [{ message: { content: "short reply" } }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    }));

    const { GeminiLLM } = require("../../../../utils/AiProviders/gemini");
    const llm = new GeminiLLM({
      embedTextInput: jest.fn(),
      embedChunks: jest.fn(),
    });

    await llm.getChatCompletion([{ role: "user", content: "hi" }], {
      temperature: 0.7,
    });

    expect(mockChatCreate).toHaveBeenCalled();
    expect(mockChatCreate.mock.calls.at(-1)[1]).toMatchObject({
      model: "gemini-2.0-flash-lite",
      max_tokens: 256,
    });
  });

  test("includes Gemini output cap on stream chat requests when configured", async () => {
    process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS = "128";
    mockChatCreate.mockImplementation(async (_apiKey, payload) => payload);

    const { GeminiLLM } = require("../../../../utils/AiProviders/gemini");
    const llm = new GeminiLLM({
      embedTextInput: jest.fn(),
      embedChunks: jest.fn(),
    });

    await llm.streamGetChatCompletion(
      [{ role: "user", content: "stream please" }],
      {
        temperature: 0.7,
      }
    );

    expect(mockChatCreate.mock.calls.at(-1)[1]).toMatchObject({
      stream: true,
      max_tokens: 128,
    });
  });

  test("omits Gemini output cap when the setting is not configured", async () => {
    delete process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS;
    mockChatCreate.mockImplementation(async () => ({
      choices: [{ message: { content: "default reply" } }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    }));

    const { GeminiLLM } = require("../../../../utils/AiProviders/gemini");
    const llm = new GeminiLLM({
      embedTextInput: jest.fn(),
      embedChunks: jest.fn(),
    });

    await llm.getChatCompletion([{ role: "user", content: "hi" }], {
      temperature: 0.7,
    });

    expect(mockChatCreate.mock.calls.at(-1)[1].max_tokens).toBeUndefined();
  });
});
