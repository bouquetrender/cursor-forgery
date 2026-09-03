# cursor-forgery

[English](README.md) | [简体中文](README.zh-CN.md)

`cursor-forgery` is a VS Code extension that emulates Cursor-style editor
interactions. It adds one-click Codex context actions for code selections and
entire files while retaining review tools for text-file changes made by external
coding agents. It does not call an AI API or modify how an agent works.

## Workflow

1. Run **Agent Review: Start Session** from the Command Palette.
2. Let Codex, Claude, or another tool edit files in the open workspace.
3. Open **AGENT CHANGES** in the Explorer.
4. Select a hunk to open VS Code's native diff editor at that change.
5. Use the `Accept` / `Reject` CodeLens above the changed lines, or use file/all
   commands from the tree and Command Palette.

When the official Codex extension is installed and enabled, selecting code shows
`Add to Codex Thread` and `Add File to Codex Thread` above the selection. Click
them to add the current selection or the entire file to Codex without opening the
context menu.

Accepting a hunk keeps the current file unchanged and advances only that portion
of the baseline. Rejecting a hunk uses a `WorkspaceEdit` to restore the baseline
text. Every operation recalculates all hunks for the affected file.

Edits typed in VS Code are treated as user-owned work and automatically advance
the baseline instead of creating review hunks. If the file already has pending
agent changes, editing it means the user takes ownership of its complete current
state and clears those pending hunks.

## Commands

- `Agent Review: Start Session`
- `Agent Review: View Before ↔ After`
- `Agent Review: Accept Hunk`
- `Agent Review: Reject Hunk`
- `Agent Review: Accept File`
- `Agent Review: Reject File`
- `Agent Review: Accept All`
- `Agent Review: Reject All`

## Development

```sh
npm install
npm run compile
npm run test:unit
npm run test:integration
```

Press `F5` in VS Code to launch an Extension Development Host. The extension is
compatible with VS Code 1.85 and later; the pinned development dependencies also
work with Node 16.20.1.

## Current scope

- A Git workspace uses an isolated temporary index, object directory, and tree.
  The real Git index and staging area are never changed.
- Git file discovery uses the repository index and ignore rules. The temporary
  index starts from a copy of the real index so unchanged files reuse Git's stat
  cache; startup does not read every file body.
- Non-Git and multi-root workspaces fall back to an in-memory baseline through
  the same `BaselineStore` interface.
- Existing UTF-8 text files are supported.
- File changes are detected with a debounced `FileSystemWatcher`.
- New, deleted, renamed, binary, and non-UTF-8 files are not reviewed yet.
- VS Code's stable API does not expose the identity of an editor. Changes that
  make a VS Code document dirty are considered user edits; direct filesystem
  writes are considered agent edits. Consequently, user saves made in another
  editor are reviewed as external changes, while another VS Code extension using
  `WorkspaceEdit` is considered user-originated.
