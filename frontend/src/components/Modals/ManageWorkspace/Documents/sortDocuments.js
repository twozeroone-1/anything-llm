export const DEFAULT_DIRECTORY_SORT = {
  sortBy: "name",
  sortDirection: "asc",
};

export const DEFAULT_WORKSPACE_SORT = {
  sortBy: "name",
  sortDirection: "asc",
  customSortApplied: false,
};

function getComparableName(item = {}) {
  return String(item.title || item.name || "").toLowerCase();
}

function getComparableDate(item = {}) {
  const timestamp = Date.parse(item.published || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getComparableType(item = {}) {
  const source = String(item.url || item.name || item.title || "");
  if (!source.includes(".")) return null;
  return source.split(".").pop().toLowerCase();
}

function compareMissingLast(aValue, bValue) {
  const aMissing = aValue === null || aValue === "";
  const bMissing = bValue === null || bValue === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return null;
}

function compareValues(aValue, bValue, direction = "asc") {
  const missingComparison = compareMissingLast(aValue, bValue);
  if (missingComparison !== null) return missingComparison;

  if (aValue < bValue) return direction === "desc" ? 1 : -1;
  if (aValue > bValue) return direction === "desc" ? -1 : 1;
  return 0;
}

function getSortValue(item, sortBy) {
  switch (sortBy) {
    case "date":
      return getComparableDate(item);
    case "type":
      return getComparableType(item);
    case "name":
    default:
      return getComparableName(item);
  }
}

export function sortDocumentItems(
  items = [],
  { sortBy = "name", sortDirection = "asc" } = DEFAULT_DIRECTORY_SORT
) {
  return [...items].sort((a, b) => {
    const primary = compareValues(
      getSortValue(a, sortBy),
      getSortValue(b, sortBy),
      sortDirection
    );
    if (primary !== 0) return primary;

    return compareValues(getComparableName(a), getComparableName(b), "asc");
  });
}

export function sortWorkspaceItems(
  items = [],
  { workspace, movedItems = [], sortBy = "name", sortDirection = "asc" } = {}
) {
  const movedIds = new Set(movedItems.map((item) => item.id));
  const moved = [];
  const pinned = [];
  const regular = [];

  for (const item of items) {
    if (movedIds.has(item.id)) {
      moved.push(item);
      continue;
    }

    if (item.pinnedWorkspaces?.includes(workspace?.id)) {
      pinned.push(item);
      continue;
    }

    regular.push(item);
  }

  return [
    ...sortDocumentItems(moved, { sortBy, sortDirection }),
    ...sortDocumentItems(pinned, { sortBy, sortDirection }),
    ...sortDocumentItems(regular, { sortBy, sortDirection }),
  ];
}

export function sortDirectoryFolders(
  folders = [],
  sortState = DEFAULT_DIRECTORY_SORT
) {
  return folders.map((folder) => ({
    ...folder,
    items: sortDocumentItems(folder.items || [], sortState),
  }));
}

export function getWorkspaceDisplayItems(
  items = [],
  { workspace, movedItems = [], sortState = DEFAULT_WORKSPACE_SORT } = {}
) {
  if (sortState.customSortApplied) {
    return sortWorkspaceItems(items, {
      workspace,
      movedItems,
      sortBy: sortState.sortBy,
      sortDirection: sortState.sortDirection,
    });
  }

  const movedIds = new Set(movedItems.map((item) => item.id));
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aPriority = movedIds.has(a.item.id)
        ? 0
        : a.item.pinnedWorkspaces?.includes(workspace?.id)
          ? 1
          : 2;
      const bPriority = movedIds.has(b.item.id)
        ? 0
        : b.item.pinnedWorkspaces?.includes(workspace?.id)
          ? 1
          : 2;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
