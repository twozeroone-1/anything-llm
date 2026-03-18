# AnythingLLM Upload Modal Sort Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent sort controls to both panels in the AnythingLLM "Upload to Workspace" modal so users can sort by name, date, or file type in ascending or descending order.

**Architecture:** Keep sorting client-side inside the existing modal flow. Isolate the sortable behavior in a pure helper module with Node-native tests first, then wire a compact header control into the left and right panel components while preserving the existing folder tree, search, moved-item priority, and pinned-item priority rules.

**Tech Stack:** React 18, Vite, utility-class CSS, i18next locale strings, Node `node:test`, Docker

---

## File Structure

- Create: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js`
  - Pure sorting helpers and default sort state constants for both panels.
- Create: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js`
  - Node-native regression tests for name/date/type ordering and workspace priority grouping.
- Create: `frontend/src/components/Modals/ManageWorkspace/Documents/SortControl/index.jsx`
  - Compact header control for sort field + direction.
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/index.jsx`
  - Own left/right sort state and pass it down.
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/Directory/index.jsx`
  - Render left-panel sort control and apply per-folder sorted file lists after search filtering.
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/Directory/FolderRow/index.jsx`
  - Accept pre-sorted folder data without changing selection behavior.
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/WorkspaceDirectory/index.jsx`
  - Render right-panel sort control and apply sort inside existing moved/pinned priority groups.
- Modify: `frontend/src/locales/en/common.js`
  - Add English strings for sort labels and directions.

## Chunk 1: Sorting Helper And Tests

### Task 1: Create the failing sort regression test

**Files:**
- Create: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js`
- Create: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  sortDocumentItems,
  sortWorkspaceItems,
} from "./sortDocuments.js";

test("sortDocumentItems sorts by name, date, and type", () => {
  const items = [
    { id: "2", title: "beta.docx", name: "beta.docx", published: "2026-03-11", url: "beta.docx" },
    { id: "1", title: "Alpha.pdf", name: "Alpha.pdf", published: "2026-03-18", url: "Alpha.pdf" },
    { id: "3", title: "gamma", name: "gamma", published: null, url: "gamma" },
  ];

  assert.deepEqual(
    sortDocumentItems(items, { sortBy: "name", sortDirection: "asc" }).map((item) => item.id),
    ["1", "2", "3"]
  );
});

test("sortWorkspaceItems preserves moved and pinned priority before field sorting", () => {
  const workspace = { id: 42 };
  const movedItems = [{ id: "moved" }];
  const items = [
    { id: "plain", title: "Zulu.pdf", name: "Zulu.pdf", published: "2026-03-10", url: "Zulu.pdf" },
    { id: "pinned", title: "Alpha.docx", name: "Alpha.docx", published: "2026-03-12", url: "Alpha.docx", pinnedWorkspaces: [42] },
    { id: "moved", title: "Middle.txt", name: "Middle.txt", published: "2026-03-11", url: "Middle.txt" },
  ];

  assert.deepEqual(
    sortWorkspaceItems(items, {
      sortBy: "name",
      sortDirection: "asc",
      workspace,
      movedItems,
    }).map((item) => item.id),
    ["moved", "pinned", "plain"]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: FAIL because `sortDocuments.js` does not exist or required exports are missing.

- [ ] **Step 3: Write minimal implementation**

```js
const SORT_FIELDS = {
  name: "name",
  date: "date",
  type: "type",
};

function getComparableName(item) {
  return (item.title || item.name || "").toLowerCase();
}

function getComparableDate(item) {
  const timestamp = Date.parse(item.published || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getComparableType(item) {
  const source = item.url || item.name || item.title || "";
  const extension = source.includes(".") ? source.split(".").pop().toLowerCase() : null;
  return extension;
}

export function sortDocumentItems(items = [], sort = { sortBy: "name", sortDirection: "asc" }) {
  return [...items].sort((a, b) => {
    // Compare selected field, push missing values to the end, then fallback to name.
  });
}

export function sortWorkspaceItems(items = [], { workspace, movedItems = [], sortBy, sortDirection }) {
  // Keep moved items first, pinned items next, then apply sortDocumentItems inside each priority group.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: PASS for both regression tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
git commit -m "Add document modal sorting helpers"
```

### Task 2: Expand the helper tests to lock edge cases

**Files:**
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js`
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js`

- [ ] **Step 1: Write the failing test**

Add cases for:

```js
test("sortDocumentItems puts missing dates and missing extensions last", () => {
  // verify date/type sorts do not break on null metadata
});

test("sortDocumentItems compares names case-insensitively", () => {
  // verify Alpha and alpha order is stable
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: FAIL on the new edge-case assertions.

- [ ] **Step 3: Write minimal implementation**

Update the helper so that:

- missing dates always sort after valid dates
- missing extensions always sort after valid extensions
- name fallback is case-insensitive
- direction inversion only affects the chosen field, not the "missing values last" rule

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: PASS for all helper tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
git commit -m "Cover document sort edge cases"
```

## Chunk 2: Modal State And UI Wiring

### Task 3: Add shared sort state to the modal container

**Files:**
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/index.jsx`
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js`

- [ ] **Step 1: Write the failing test**

Extend the helper test with exported defaults:

```js
import { DEFAULT_DIRECTORY_SORT, DEFAULT_WORKSPACE_SORT } from "./sortDocuments.js";

test("exports default left and right panel sort states", () => {
  assert.deepEqual(DEFAULT_DIRECTORY_SORT, { sortBy: "name", sortDirection: "asc" });
  assert.equal(DEFAULT_WORKSPACE_SORT.customSortApplied, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: FAIL because the default state exports do not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `sortDocuments.js` export:

```js
export const DEFAULT_DIRECTORY_SORT = { sortBy: "name", sortDirection: "asc" };
export const DEFAULT_WORKSPACE_SORT = {
  sortBy: "name",
  sortDirection: "asc",
  customSortApplied: false,
};
```

Then update `Documents/index.jsx` to:

- initialize `directorySort` and `workspaceSort`
- pass `sortState` and `setSortState` props into `Directory` and `WorkspaceDirectory`
- flip `customSortApplied` to `true` the first time the workspace sort changes

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: PASS for all helper/default-state tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modals/ManageWorkspace/Documents/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
git commit -m "Add upload modal sort state"
```

### Task 4: Add a reusable header sort control and wire the left panel

**Files:**
- Create: `frontend/src/components/Modals/ManageWorkspace/Documents/SortControl/index.jsx`
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/Directory/index.jsx`
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/Directory/FolderRow/index.jsx`
- Modify: `frontend/src/locales/en/common.js`

- [ ] **Step 1: Write the failing test**

Add a helper-level regression that models post-search folder ordering:

```js
import { sortDirectoryFolders } from "./sortDocuments.js";

test("sortDirectoryFolders preserves folder order while sorting each folder's items", () => {
  const folders = [
    { id: "folder-a", name: "reports", items: [{ id: "2", title: "beta.pdf", name: "beta.pdf", url: "beta.pdf" }, { id: "1", title: "Alpha.pdf", name: "Alpha.pdf", url: "Alpha.pdf" }] },
  ];

  assert.deepEqual(
    sortDirectoryFolders(folders, { sortBy: "name", sortDirection: "asc" })[0].items.map((item) => item.id),
    ["1", "2"]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: FAIL because `sortDirectoryFolders` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add `sortDirectoryFolders` to `sortDocuments.js`:

```js
export function sortDirectoryFolders(folders = [], sortState) {
  return folders.map((folder) => ({
    ...folder,
    items: sortDocumentItems(folder.items || [], sortState),
  }));
}
```

Then:

- add `SortControl/index.jsx` with two compact controls
- render it in the right side of the left-panel header
- apply `sortDirectoryFolders` after `filterFileSearchResults`
- pass the derived sorted folder object into `FolderRow`
- add locale keys such as:
  - `sort-by`
  - `sort-direction`
  - `sort-name`
  - `sort-date`
  - `sort-type`
  - `sort-asc`
  - `sort-desc`

- [ ] **Step 4: Run verification**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
corepack yarn --cwd frontend lint:check
corepack yarn --cwd frontend build
```

Expected:

- helper tests PASS
- frontend lint passes
- frontend build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modals/ManageWorkspace/Documents/SortControl/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/Directory/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/Directory/FolderRow/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js frontend/src/locales/en/common.js
git commit -m "Add left panel sort controls"
```

### Task 5: Wire the workspace panel without breaking moved/pinned priority

**Files:**
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/WorkspaceDirectory/index.jsx`
- Modify: `frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js`

- [ ] **Step 1: Write the failing test**

Add a grouping regression for the right panel:

```js
test("sortWorkspaceItems sorts inside moved, pinned, and regular groups", () => {
  const workspace = { id: 7 };
  const movedItems = [{ id: "m1" }, { id: "m2" }];
  const items = [
    { id: "m2", title: "Zulu.txt", name: "Zulu.txt", published: "2026-03-12", url: "Zulu.txt" },
    { id: "m1", title: "Alpha.txt", name: "Alpha.txt", published: "2026-03-11", url: "Alpha.txt" },
    { id: "p1", title: "Bravo.pdf", name: "Bravo.pdf", published: "2026-03-10", url: "Bravo.pdf", pinnedWorkspaces: [7] },
    { id: "r1", title: "Charlie.docx", name: "Charlie.docx", published: "2026-03-09", url: "Charlie.docx" },
  ];

  assert.deepEqual(
    sortWorkspaceItems(items, { sortBy: "name", sortDirection: "asc", workspace, movedItems }).map((item) => item.id),
    ["m1", "m2", "p1", "r1"]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: FAIL because the grouping logic is incomplete.

- [ ] **Step 3: Write minimal implementation**

Update `sortWorkspaceItems` so it:

- builds `moved`, `pinned`, and `regular` arrays
- sorts each array with `sortDocumentItems`
- concatenates them in priority order

Then update `WorkspaceDirectory/index.jsx` to:

- render `SortControl` in the header
- use legacy rendering order when `customSortApplied` is false
- switch to `sortWorkspaceItems` once the user changes sorting
- keep existing remove/select/pin/watch actions intact

- [ ] **Step 4: Run verification**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
corepack yarn --cwd frontend lint:check
corepack yarn --cwd frontend build
```

Expected:

- helper tests PASS
- frontend lint passes
- frontend build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modals/ManageWorkspace/Documents/WorkspaceDirectory/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
git commit -m "Add workspace panel sort controls"
```

## Chunk 3: Runtime Verification And Docker Rollout

### Task 6: Rebuild the image and recreate the local container

**Files:**
- Modify: working tree only for built frontend assets inside the Docker image
- Verify: `http://localhost:3801/`

- [ ] **Step 1: Run the targeted test suite**

Run:

```bash
node --test frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js
```

Expected: PASS

- [ ] **Step 2: Run final static verification**

Run:

```bash
corepack yarn --cwd frontend lint:check
corepack yarn --cwd frontend build
```

Expected:

- lint passes with no new errors
- build completes successfully

- [ ] **Step 3: Build the Docker image**

Run:

```bash
docker build -f docker/Dockerfile -t anythingllm:rokid-gemini-multi-key-fallback .
```

Expected: image rebuild completes successfully.

- [ ] **Step 4: Recreate the container**

Run:

```powershell
$storage = 'C:\Users\W\.config\superpowers\worktrees\rokid-project\anythingllm-docs-provider\.tmp\anythingllm-storage'
$envFile = 'C:\Users\W\.config\superpowers\worktrees\rokid-project\anythingllm-docs-provider\.tmp\anythingllm-storage\.env'

docker rm -f anythingllm-rokid-test

docker run -d `
  --name anythingllm-rokid-test `
  --cap-add SYS_ADMIN `
  -p 3801:3001 `
  -e STORAGE_DIR=/app/server/storage `
  -v "${storage}:/app/server/storage" `
  -v "${envFile}:/app/server/.env" `
  anythingllm:rokid-gemini-multi-key-fallback
```

Expected: new container ID is returned.

- [ ] **Step 5: Verify health and UI behavior**

Run:

```bash
docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' anythingllm-rokid-test
```

Expected: `healthy`

Run:

```powershell
(Invoke-WebRequest -UseBasicParsing 'http://localhost:3801/api/ping').Content
```

Expected:

```json
{"online":true}
```

Then in the browser:

1. Open `http://localhost:3801/`
2. Open a workspace
3. Click the document upload/manage modal
4. Confirm left-panel header shows the compact sort controls
5. Confirm right-panel header shows the compact sort controls
6. Verify `Name`, `Date`, and `Type` sort fields work in both directions
7. Verify left-panel search still filters and respects sort
8. Verify moved items and pinned items still stay prioritized in the workspace panel

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Modals/ManageWorkspace/Documents/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/Directory/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/Directory/FolderRow/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/SortControl/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/WorkspaceDirectory/index.jsx frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.js frontend/src/components/Modals/ManageWorkspace/Documents/sortDocuments.test.js frontend/src/locales/en/common.js
git commit -m "Add upload modal sorting controls"
```

## Notes

- Do not persist sort state in this iteration.
- Do not reorder the left-panel folders themselves.
- Do not replace the existing right-panel priority rules; sort inside those groups only.
- Keep the change set focused on the upload/manage modal.
