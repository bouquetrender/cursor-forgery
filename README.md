# cursor-forgery

[English](README.md) | [简体中文](README.zh-CN.md)

`cursor-forgery` is a VS Code extension that emulates Cursor interactions. It
reviews changes made by agents to code files and can quickly add a code selection
or an entire file to a Codex thread. The extension does not call any APIs or
change how agents work.

## Workflow

1. Run **Agent Review: Start Session** to capture a baseline.
2. Let Codex, Claude, or another agent edit workspace files.
3. Open **AGENT CHANGES** in Explorer.
4. Select a file or hunk to open the current file at that line.
5. Accept, reject, or request a change from the tree or CodeLens.

## Sidebar

- **Current Turn**: pending changes. Items disappear after Accept or Reject.
- **All Agent Changes**: read-only history for the current session, collapsed by
  default. A new change at the same location replaces the old entry. Starting a
  new session clears the history.

## Review actions

- `Accept`: keep the current code and advance the baseline.
- `Reject`: restore code from the baseline.
- `Request Change`: select the changed code and add it to the Codex thread.

Editing a file manually in VS Code takes ownership of that file. The extension
updates its baseline and clears its pending review changes.

## Codex context

With the official Codex extension installed, select code to use
`Add to Codex Thread` or `Add File to Codex Thread`.

## Commands

- `Agent Review: Start Session`
- `Agent Review: Open Change`
- `Agent Review: View Before ↔ After`
- `Agent Review: Accept Hunk`
- `Agent Review: Reject Hunk`
- `Agent Review: Request Change`
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

Press `F5` to launch an Extension Development Host. Requires VS Code 1.85+;
development dependencies support Node 16.20.1.

## Current scope

- Only existing UTF-8 text files are supported.
- New, deleted, renamed, binary, and non-UTF-8 files are not reviewed.
- Git workspaces use an isolated temporary environment and never modify the real
  index or staging area.
- Non-Git and multi-root workspaces use an in-memory baseline.
- Direct filesystem writes are treated as agent changes. Changes that make a
  VS Code document dirty are treated as user edits.
