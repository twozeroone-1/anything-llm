import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DIRECTORY_SORT,
  DEFAULT_WORKSPACE_SORT,
  getWorkspaceDisplayItems,
  sortDocumentItems,
  sortDirectoryFolders,
  sortWorkspaceItems,
} from "./sortDocuments.js";

test("sortDocumentItems sorts by name in ascending order", () => {
  const items = [
    {
      id: "2",
      title: "beta.docx",
      name: "beta.docx",
      published: "2026-03-11",
      url: "beta.docx",
    },
    {
      id: "1",
      title: "Alpha.pdf",
      name: "Alpha.pdf",
      published: "2026-03-18",
      url: "Alpha.pdf",
    },
    {
      id: "3",
      title: "gamma",
      name: "gamma",
      published: null,
      url: "gamma",
    },
  ];

  assert.deepEqual(
    sortDocumentItems(items, { sortBy: "name", sortDirection: "asc" }).map(
      (item) => item.id
    ),
    ["1", "2", "3"]
  );
});

test("sortWorkspaceItems keeps moved items before pinned and regular items", () => {
  const workspace = { id: 42 };
  const movedItems = [{ id: "moved" }];
  const items = [
    {
      id: "plain",
      title: "Zulu.pdf",
      name: "Zulu.pdf",
      published: "2026-03-10",
      url: "Zulu.pdf",
    },
    {
      id: "pinned",
      title: "Alpha.docx",
      name: "Alpha.docx",
      published: "2026-03-12",
      url: "Alpha.docx",
      pinnedWorkspaces: [42],
    },
    {
      id: "moved",
      title: "Middle.txt",
      name: "Middle.txt",
      published: "2026-03-11",
      url: "Middle.txt",
    },
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

test("sortDocumentItems keeps missing dates and missing types at the end", () => {
  const items = [
    {
      id: "with-date",
      title: "Bravo.pdf",
      name: "Bravo.pdf",
      published: "2026-03-12",
      url: "Bravo.pdf",
    },
    {
      id: "missing-date",
      title: "Alpha.docx",
      name: "Alpha.docx",
      published: null,
      url: "Alpha.docx",
    },
    {
      id: "with-type",
      title: "Charlie.txt",
      name: "Charlie.txt",
      published: "2026-03-10",
      url: "Charlie.txt",
    },
    {
      id: "missing-type",
      title: "Delta",
      name: "Delta",
      published: "2026-03-11",
      url: "Delta",
    },
  ];

  assert.deepEqual(
    sortDocumentItems(items, { sortBy: "date", sortDirection: "desc" }).map(
      (item) => item.id
    ),
    ["with-date", "missing-type", "with-type", "missing-date"]
  );

  assert.deepEqual(
    sortDocumentItems(items, { sortBy: "type", sortDirection: "asc" }).map(
      (item) => item.id
    ),
    ["missing-date", "with-date", "with-type", "missing-type"]
  );
});

test("sortDocumentItems compares names without case sensitivity", () => {
  const items = [
    { id: "2", title: "bravo.txt", name: "bravo.txt", url: "bravo.txt" },
    { id: "1", title: "Alpha.txt", name: "Alpha.txt", url: "Alpha.txt" },
    { id: "3", title: "charlie.txt", name: "charlie.txt", url: "charlie.txt" },
  ];

  assert.deepEqual(
    sortDocumentItems(items, { sortBy: "name", sortDirection: "asc" }).map(
      (item) => item.id
    ),
    ["1", "2", "3"]
  );
});

test("exports default left and right panel sort states", () => {
  assert.deepEqual(DEFAULT_DIRECTORY_SORT, {
    sortBy: "name",
    sortDirection: "asc",
  });

  assert.deepEqual(DEFAULT_WORKSPACE_SORT, {
    sortBy: "name",
    sortDirection: "asc",
    customSortApplied: false,
  });
});

test("sortDirectoryFolders preserves folder order and sorts each folder's items", () => {
  const folders = [
    {
      id: "folder-a",
      name: "reports",
      items: [
        { id: "2", title: "beta.pdf", name: "beta.pdf", url: "beta.pdf" },
        { id: "1", title: "Alpha.pdf", name: "Alpha.pdf", url: "Alpha.pdf" },
      ],
    },
  ];

  assert.deepEqual(
    sortDirectoryFolders(folders, {
      sortBy: "name",
      sortDirection: "asc",
    })[0].items.map((item) => item.id),
    ["1", "2"]
  );
});

test("getWorkspaceDisplayItems keeps legacy order until custom sorting is enabled", () => {
  const workspace = { id: 7 };
  const movedItems = [{ id: "m2" }, { id: "m1" }];
  const items = [
    {
      id: "m2",
      title: "Zulu.txt",
      name: "Zulu.txt",
      published: "2026-03-12",
      url: "Zulu.txt",
    },
    {
      id: "r1",
      title: "Charlie.docx",
      name: "Charlie.docx",
      published: "2026-03-09",
      url: "Charlie.docx",
    },
    {
      id: "p1",
      title: "Bravo.pdf",
      name: "Bravo.pdf",
      published: "2026-03-10",
      url: "Bravo.pdf",
      pinnedWorkspaces: [7],
    },
    {
      id: "m1",
      title: "Alpha.txt",
      name: "Alpha.txt",
      published: "2026-03-11",
      url: "Alpha.txt",
    },
  ];

  assert.deepEqual(
    getWorkspaceDisplayItems(items, {
      workspace,
      movedItems,
      sortState: {
        sortBy: "name",
        sortDirection: "asc",
        customSortApplied: false,
      },
    }).map((item) => item.id),
    ["m2", "m1", "p1", "r1"]
  );

  assert.deepEqual(
    getWorkspaceDisplayItems(items, {
      workspace,
      movedItems,
      sortState: {
        sortBy: "name",
        sortDirection: "asc",
        customSortApplied: true,
      },
    }).map((item) => item.id),
    ["m1", "m2", "p1", "r1"]
  );
});
