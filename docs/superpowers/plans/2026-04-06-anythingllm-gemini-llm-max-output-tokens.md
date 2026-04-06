# AnythingLLM Gemini LLM Max Output Tokens Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an instance-level Gemini LLM output cap so the selected Gemini model produces shorter final answers, including RAG-backed final responses, when an administrator sets a max output token value.

**Architecture:** Keep the current Gemini general-chat provider and add one provider-specific output-cap setting that flows from the LLM settings UI into the Gemini request payload. Cover the setting with server-side persistence tests and provider payload tests first, then verify with a live smoke test that the compatibility endpoint actually honors the cap for normal chat and RAG final answers.

**Tech Stack:** React 18, Vite, Node.js, Express, Jest, Docker, Gemini OpenAI-compatible endpoint

---

## File Structure

- Create: `server/__tests__/models/systemSettings.test.js`
  - Regression coverage for exposing Gemini max output tokens through `SystemSettings.currentSettings()`.
- Modify: `server/__tests__/utils/helpers/updateENV.gemini.test.js`
  - Validation coverage for saving and rejecting Gemini max output token values.
- Modify: `server/__tests__/utils/AiProviders/gemini/index.test.js`
  - Request-payload coverage for stream and non-stream Gemini chat calls.
- Modify: `server/models/systemSettings.js`
  - Return the new Gemini setting to the admin UI.
- Modify: `server/utils/helpers/updateENV.js`
  - Persist and validate the new Gemini setting.
- Modify: `server/utils/AiProviders/gemini/index.js`
  - Read the new setting and inject it into Gemini general chat requests.
- Modify: `frontend/src/components/LLMSelection/GeminiLLMOptions/index.jsx`
  - Add the Gemini max output tokens numeric input to the existing Gemini LLM settings panel.

## Chunk 1: Settings Contract

### Task 1: Add failing persistence tests for the new Gemini setting

**Files:**
- Modify: `server/__tests__/utils/helpers/updateENV.gemini.test.js`
- Create: `server/__tests__/models/systemSettings.test.js`

- [ ] **Step 1: Write the failing tests**

Extend `updateENV.gemini.test.js` with:

```js
test("stores Gemini LLM max output tokens as a positive integer string", async () => {
  const { updateENV } = require("../../../utils/helpers/updateENV");

  const { error } = await updateENV({
    GeminiLLMMaxOutputTokens: "512",
  });

  expect(error).toBe(false);
  expect(process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS).toBe("512");
});

test("rejects Gemini LLM max output tokens when the value is zero", async () => {
  const { updateENV } = require("../../../utils/helpers/updateENV");

  const { error, reason } = await updateENV({
    GeminiLLMMaxOutputTokens: "0",
  });

  expect(error).toBe(true);
  expect(String(reason)).toMatch(/non-zero|greater than 0/i);
});
```

Create `server/__tests__/models/systemSettings.test.js` with:

```js
/* eslint-env jest */

jest.mock("../../utils/gemini/keyPool", () => ({
  getConfiguredGeminiKeyCount: jest.fn(() => 1),
  hasConfiguredGeminiApiKeys: jest.fn(() => true),
}));
jest.mock("../../utils/helpers", () => ({
  getBaseLLMProviderModel: jest.fn(() => "gemini-3.1-flash-lite-preview"),
}));

describe("SystemSettings Gemini preferences", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      LLM_PROVIDER: "gemini",
      GEMINI_LLM_MODEL_PREF: "gemini-3.1-flash-lite-preview",
      GEMINI_LLM_MAX_OUTPUT_TOKENS: "512",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("exposes GeminiLLMMaxOutputTokens in current settings", async () => {
    const { SystemSettings } = require("../../models/systemSettings");
    const settings = await SystemSettings.currentSettings();

    expect(settings.GeminiLLMMaxOutputTokens).toBe("512");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx jest server/__tests__/utils/helpers/updateENV.gemini.test.js server/__tests__/models/systemSettings.test.js --runInBand
```

Expected: FAIL because the new setting key is not yet recognized or surfaced.

- [ ] **Step 3: Write minimal implementation**

Update `server/utils/helpers/updateENV.js`:

```js
GeminiLLMMaxOutputTokens: {
  envKey: "GEMINI_LLM_MAX_OUTPUT_TOKENS",
  checks: [nonZero],
},
```

Update `server/models/systemSettings.js` under `llmPreferenceKeys()`:

```js
GeminiLLMMaxOutputTokens: process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS || null,
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx jest server/__tests__/utils/helpers/updateENV.gemini.test.js server/__tests__/models/systemSettings.test.js --runInBand
```

Expected: PASS for the new Gemini setting persistence coverage.

- [ ] **Step 5: Commit**

```bash
git add server/__tests__/utils/helpers/updateENV.gemini.test.js server/__tests__/models/systemSettings.test.js server/utils/helpers/updateENV.js server/models/systemSettings.js
git commit -m "feat: add gemini llm output token setting"
```

## Chunk 2: Gemini Provider Wiring

### Task 2: Add failing Gemini provider tests for request payload injection

**Files:**
- Modify: `server/__tests__/utils/AiProviders/gemini/index.test.js`
- Modify: `server/utils/AiProviders/gemini/index.js`

- [ ] **Step 1: Write the failing tests**

Extend `server/__tests__/utils/AiProviders/gemini/index.test.js` with:

```js
test("includes Gemini output cap on non-stream chat requests when configured", async () => {
  mockChatCreate.mockImplementation(async () => ({
    choices: [{ message: { content: "short reply" } }],
    usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
  }));

  process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS = "256";

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
  mockChatCreate.mockImplementation(async (_apiKey, payload) => payload);
  process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS = "128";

  const { GeminiLLM } = require("../../../../utils/AiProviders/gemini");
  const llm = new GeminiLLM({
    embedTextInput: jest.fn(),
    embedChunks: jest.fn(),
  });

  await llm.streamGetChatCompletion([{ role: "user", content: "stream please" }], {
    temperature: 0.7,
  });

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx jest server/__tests__/utils/AiProviders/gemini/index.test.js --runInBand
```

Expected: FAIL because the Gemini provider does not yet read or pass the new setting.

- [ ] **Step 3: Write minimal implementation**

In `server/utils/AiProviders/gemini/index.js`, add a small request builder:

```js
  get maxOutputTokens() {
    const rawValue = process.env.GEMINI_LLM_MAX_OUTPUT_TOKENS;
    if (!rawValue) return null;
    const parsed = Number(rawValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  buildChatRequest(messages, { temperature = 0.7, stream = false } = {}) {
    return {
      model: this.model,
      messages,
      temperature,
      ...(stream
        ? {
            stream: true,
            stream_options: { include_usage: true },
          }
        : {}),
      ...(this.maxOutputTokens ? { max_tokens: this.maxOutputTokens } : {}),
    };
  }
```

Then use `buildChatRequest(...)` in both `getChatCompletion` and `streamGetChatCompletion`.

Note:

- `max_tokens` here is an implementation inference from the current OpenAI-compatible chat-completions transport.
- Do not claim completion until the live smoke test confirms the Gemini compatibility endpoint honors it.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx jest server/__tests__/utils/AiProviders/gemini/index.test.js --runInBand
```

Expected: PASS for stream and non-stream payload coverage.

- [ ] **Step 5: Commit**

```bash
git add server/__tests__/utils/AiProviders/gemini/index.test.js server/utils/AiProviders/gemini/index.js
git commit -m "feat: cap gemini llm output tokens"
```

## Chunk 3: Gemini Settings UI

### Task 3: Add the Gemini max output tokens field to the admin UI

**Files:**
- Modify: `frontend/src/components/LLMSelection/GeminiLLMOptions/index.jsx`

- [ ] **Step 1: Write the failing test**

Because this repo does not currently keep a focused frontend test harness for this component, use a DOM-level manual check as the red step:

Run the app locally, open `Settings > AI Provider > LLM > Gemini`, and confirm there is no `Gemini max output tokens` input yet.

Expected: The field does not exist.

- [ ] **Step 2: Write minimal implementation**

Add a numeric input next to the existing Gemini model selection:

```jsx
<div className="flex flex-col w-60">
  <label className="text-white text-sm font-semibold block mb-3">
    Gemini max output tokens
  </label>
  <input
    type="number"
    name="GeminiLLMMaxOutputTokens"
    className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
    placeholder="Leave blank to use provider default"
    min={1}
    defaultValue={settings?.GeminiLLMMaxOutputTokens || ""}
    autoComplete="off"
  />
  <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
    Caps the final Gemini answer length for standard chat and RAG responses.
  </p>
</div>
```

Placement rules:

- keep it in the existing Gemini LLM block
- do not add a forced default like `1024`
- keep blank as the safe default

- [ ] **Step 3: Run manual check to verify it appears**

Run the frontend locally and revisit `Settings > AI Provider > LLM > Gemini`.

Expected:

- the new numeric field is visible
- it is populated when `GEMINI_LLM_MAX_OUTPUT_TOKENS` is set
- it is blank when unset

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/LLMSelection/GeminiLLMOptions/index.jsx
git commit -m "feat: add gemini output token control"
```

## Chunk 4: End-To-End Verification

### Task 4: Verify the cap affects both plain chat and RAG final answers

**Files:**
- Modify: none
- Test: local Docker runtime or a dedicated test instance configured with Gemini

- [ ] **Step 1: Start a clean local or test runtime**

Run:

```bash
docker build -f docker/Dockerfile -t anythingllm-gemini-cap .
docker run --rm -p 3001:3001 --env-file .env anythingllm-gemini-cap
```

Expected: AnythingLLM boots and Gemini is available as the selected LLM provider.

- [ ] **Step 2: Save a very small Gemini output cap**

In the admin UI:

- select `Gemini` as the LLM provider if not already selected
- set `Gemini max output tokens` to a small value such as `64`
- save changes

Expected: Save succeeds and the field persists after refresh.

- [ ] **Step 3: Verify plain chat truncates as expected**

Ask a question that normally yields a long answer.

Expected:

- the reply is noticeably shorter than an uncapped response
- the request does not fail validation

- [ ] **Step 4: Verify RAG final answers also truncate**

Use a workspace with embedded documents and ask a query-mode question that normally yields a long grounded answer.

Expected:

- retrieval still occurs
- the final answer is noticeably shorter than an uncapped response

- [ ] **Step 5: Decide completion based on transport behavior**

If the compatibility endpoint clearly honors the cap:

- mark the feature complete

If the compatibility endpoint ignores or rejects the cap:

- do not ship the feature as complete
- capture the observed failure
- create a follow-up design to migrate only the general Gemini chat provider to native Gemini API for official `maxOutputTokens` support

- [ ] **Step 6: Final verification run**

Run:

```bash
npx jest server/__tests__/utils/helpers/updateENV.gemini.test.js server/__tests__/models/systemSettings.test.js server/__tests__/utils/AiProviders/gemini/index.test.js --runInBand
```

Expected: PASS for all Gemini max output token regression coverage.

- [ ] **Step 7: Commit**

```bash
git status --short
```

Expected: no uncommitted code changes remain beyond the intended feature work.

Plan complete and saved to `docs/superpowers/plans/2026-04-06-anythingllm-gemini-llm-max-output-tokens.md`. Ready to execute?
