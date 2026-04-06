/* eslint-env jest */

jest.mock(
  "dotenv",
  () => ({
    config: jest.fn(),
  }),
  { virtual: true }
);
jest.mock(
  "slugify",
  () => ({
    default: jest.fn((value) => value),
  }),
  { virtual: true }
);
jest.mock(
  "uuid",
  () => ({
    v4: jest.fn(() => "test-uuid"),
  }),
  { virtual: true }
);
jest.mock("../../utils/http", () => ({
  isValidUrl: jest.fn(() => true),
  safeJsonParse: jest.fn((value, fallback = []) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }),
}));
jest.mock("../../utils/prisma", () => ({
  system_settings: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
}));
jest.mock("../../utils/files", () => ({
  hasVectorCachedFiles: jest.fn(() => false),
}));
jest.mock("../../models/documents", () => ({
  Document: {
    count: jest.fn(async () => 0),
  },
}));
jest.mock("../../utils/EmbeddingEngines/native", () => ({
  NativeEmbedder: {
    _getEmbeddingModel: jest.fn(() => "Xenova/all-MiniLM-L6-v2"),
  },
}));
jest.mock("../../utils/gemini/keyPool", () => ({
  getConfiguredGeminiKeyCount: jest.fn(() => 1),
  hasConfiguredGeminiApiKeys: jest.fn(() => true),
}));
jest.mock("../../utils/helpers", () => ({
  getBaseLLMProviderModel: jest.fn(() => "gemini-3.1-flash-lite-preview"),
}));
jest.mock("../../utils/vectorDbProviders/pgvector", () => ({
  PGVector: {
    connectionString: jest.fn(() => null),
    tableName: jest.fn(() => null),
  },
}));
jest.mock("../../utils/boot/MetaGenerator", () => ({
  MetaGenerator: class MetaGenerator {
    clearConfig() {}
  },
}));
jest.mock(
  "../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors/utils",
  () => ({
    ConnectionStringParser: class ConnectionStringParser {
      parse() {
        return {
          username: null,
          password: null,
          hosts: [],
          endpoint: null,
          scheme: null,
        };
      }
    },
  })
);
const prisma = require("../../utils/prisma");

describe("SystemSettings Gemini preferences", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.system_settings.findFirst.mockResolvedValue(null);
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      LLM_PROVIDER: "gemini",
      GEMINI_API_KEYS: "alpha",
      GEMINI_API_KEY: "alpha",
      GEMINI_LLM_MODEL_PREF: "gemini-3.1-flash-lite-preview",
      GEMINI_LLM_MAX_OUTPUT_TOKENS: "512",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("exposes GeminiLLMMaxOutputTokens in current settings", async () => {
    const { SystemSettings } = require("../../models/systemSettings");
    const settings = await SystemSettings.currentSettings();

    expect(settings.GeminiLLMMaxOutputTokens).toBe("512");
  });
});
