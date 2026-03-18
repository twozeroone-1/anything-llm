# AnythingLLM Upload Modal Sort Design

## Summary

Add sorting controls to the AnythingLLM "Upload to Workspace" modal at `http://localhost:3801/` so users can sort both the "My Documents" panel and the workspace documents panel without losing the existing upload, move, delete, and selection flows.

This design adds independent sort controls to both panels with support for:

- Name
- Date
- File type
- Ascending and descending direction

## Scope

In scope:

- Add visible sort controls to the header area of both document panels in the workspace document management modal.
- Support sorting by name, date, and file type.
- Support ascending and descending direction.
- Keep each panel's sort state independent.
- Preserve current behaviors for search, upload, move, delete, folder expansion, pinning, and moved-item prioritization.

Out of scope:

- Persisting sort preferences across modal reopen or page refresh.
- Reworking the left panel from a folder tree into a flat table.
- Adding server-side sort APIs.
- Refactoring unrelated document management UI.

## User Experience

### Chosen UI Direction

Use option A: place a compact sort control in the upper-right area of each panel header.

Rationale:

- It introduces the feature with minimal layout disruption.
- It avoids crowding the existing search and new-folder controls on the left panel.
- It fits the current two-panel modal structure without forcing a broader redesign.

### Panel Behavior

Left panel: "My Documents"

- Default sort is name ascending.
- Keep the folder tree layout.
- Sort files within each folder only.
- Keep folder order unchanged.
- Keep search behavior unchanged.
- Apply the active sort to filtered results as well.

Right panel: workspace documents

- Keep the existing display behavior by default.
- Once the user changes sorting, apply the chosen sort rule to the rendered list.
- Preserve current priority rules:
  - Newly moved items remain above older items.
  - Pinned items remain above unpinned items inside the non-moved group.
- Apply the user-selected sort only inside equivalent priority groups.

### Sort Options

Each panel exposes:

- Sort field: `Name`, `Date`, `Type`
- Sort direction: `Asc`, `Desc`

Behavior rules:

- Name comparisons are case-insensitive.
- Date sorting uses the best available document timestamp.
- Items without a usable date sort after items with dates.
- Type sorting uses file extension.
- Items without a file extension sort after items with extensions.

### State Lifetime

- Sort state exists only while the modal is open.
- Closing and reopening the modal resets to defaults.
- No local storage or backend persistence in this iteration.

## Technical Design

### Target Files

Primary changes:

- `frontend/src/components/Modals/ManageWorkspace/Documents/index.jsx`
- `frontend/src/components/Modals/ManageWorkspace/Documents/Directory/index.jsx`
- `frontend/src/components/Modals/ManageWorkspace/Documents/WorkspaceDirectory/index.jsx`

Likely supporting changes:

- A new shared sort helper under `frontend/src/components/Modals/ManageWorkspace/Documents/`
- Locale strings under `frontend/src/locales/en/common.js`

### State Ownership

`DocumentSettings` will own two independent sort state objects:

- one for the left panel
- one for the right panel

Each sort state contains:

- `sortBy`
- `sortDirection`
- an optional right-panel flag indicating whether custom sort is active, if needed to preserve current default rendering before the first user change

`DocumentSettings` will pass sort state and setters down to `Directory` and `WorkspaceDirectory`.

### Shared Sorting Utility

Introduce a small reusable sort utility for document items.

Responsibilities:

- Normalize values for `name`, `date`, and `type`
- Handle missing values deterministically
- Apply ascending or descending order
- Return a stable ordering where possible

This helper should work on plain item arrays so both panels can reuse it.

### Left Panel Integration

`Directory` currently renders folders through `FolderRow` and each folder's `items`.

Design:

- Before render, derive a sorted copy of each folder's `items`.
- Do not mutate source state directly.
- Do not reorder folders themselves.
- Keep selection logic compatible with the original item IDs.

### Right Panel Integration

`WorkspaceDirectory` currently flattens folders in `RenderFileRows` and applies special ordering for moved and pinned documents.

Design:

- Preserve group priority logic:
  - moved items first
  - pinned items next
  - remaining items after that
- Within those groups, apply the selected sort field and direction.
- Keep current selection, removal, and action flows intact.

### UI Controls

Add a compact control cluster in each panel header:

- sort field selector
- sort direction selector or toggle

Constraints:

- Match existing modal styling and spacing.
- Keep controls compact enough to avoid crowding narrow header space.
- Avoid changing the left-panel search interaction model.

## Error Handling

- Missing dates must not break sort behavior.
- Missing extensions must not break sort behavior.
- Sorting must work with empty folders and empty workspace lists.
- Sorting must not affect upload, delete, move, or embed operations.

## Testing Strategy

Minimum verification:

1. Left panel sorts correctly for name, date, and type in both directions.
2. Right panel sorts correctly for name, date, and type in both directions.
3. Search results in the left panel remain correctly sorted.
4. Folder expand/collapse behavior remains unchanged.
5. Moving documents to the workspace still works.
6. Removing workspace documents still works.
7. Uploading files and creating folders still works.
8. Right-panel moved-item and pinned-item priority rules remain intact.

## Risks

- The left panel uses nested folder data, so sorting must avoid mutating source structures in a way that breaks selection state.
- The right panel has existing priority rules that must stay intact even when user sorting is enabled.
- Locale coverage outside English may remain incomplete unless translation follow-up is done separately.

## Implementation Notes

- Prefer a narrow change set over refactoring the modal architecture.
- Keep sorting client-side because the modal already has the data it needs.
- Preserve the current default right-panel ordering until the user explicitly changes sorting.
