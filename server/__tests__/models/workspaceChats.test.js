jest.mock("../../utils/prisma", () => ({
  workspace_chats: {},
}));
jest.mock("../../utils/helpers/chat/responses", () => ({
  safeJSONStringify: jest.fn((value) => JSON.stringify(value)),
}));
jest.mock("../../models/workspace", () => ({
  Workspace: {
    get: jest.fn(),
  },
}));

const { WorkspaceChats } = require("../../models/workspaceChats");
const { Workspace } = require("../../models/workspace");

describe("WorkspaceChats.buildAdminChatClause", () => {
  test("returns an empty clause for the default all source view", () => {
    expect(WorkspaceChats.buildAdminChatClause()).toEqual({});
  });

  test("filters API session chats when api source is requested", () => {
    expect(
      WorkspaceChats.buildAdminChatClause({ chatSource: "api" })
    ).toEqual({
      api_session_id: { not: null },
    });
  });

  test("filters user chats when user source is requested", () => {
    expect(
      WorkspaceChats.buildAdminChatClause({ chatSource: "user" })
    ).toEqual({
      api_session_id: null,
    });
  });

  test("prefers an explicit api session id over the generic source filter", () => {
    expect(
      WorkspaceChats.buildAdminChatClause({
        chatSource: "user",
        apiSessionId: "session-123",
      })
    ).toEqual({
      api_session_id: "session-123",
    });
  });

  test("combines workspace and session filters when both are provided", () => {
    expect(
      WorkspaceChats.buildAdminChatClause({
        chatSource: "api",
        workspaceId: 42,
        apiSessionId: "session-abc",
      })
    ).toEqual({
      workspaceId: 42,
      api_session_id: "session-abc",
    });
  });
});

describe("WorkspaceChats.resolveAdminChatFilters", () => {
  beforeEach(() => {
    Workspace.get.mockReset();
  });

  test("returns an all-chats clause when no workspace slug is provided", async () => {
    await expect(WorkspaceChats.resolveAdminChatFilters()).resolves.toEqual({
      clause: {},
      workspace: null,
      workspaceSlug: null,
    });
  });

  test("marks a missing workspace slug without building a clause", async () => {
    Workspace.get.mockResolvedValue(null);

    await expect(
      WorkspaceChats.resolveAdminChatFilters({ workspaceSlug: "missing" })
    ).resolves.toEqual({
      clause: null,
      workspace: null,
      workspaceSlug: "missing",
    });
  });

  test("resolves the workspace slug and folds it into the admin clause", async () => {
    Workspace.get.mockResolvedValue({ id: 42, slug: "2nd" });

    await expect(
      WorkspaceChats.resolveAdminChatFilters({
        chatSource: "api",
        workspaceSlug: "2nd",
      })
    ).resolves.toEqual({
      clause: {
        workspaceId: 42,
        api_session_id: { not: null },
      },
      workspace: { id: 42, slug: "2nd" },
      workspaceSlug: "2nd",
    });
  });
});
