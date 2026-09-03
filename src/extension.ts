import * as vscode from "vscode";
import { HunkCommands } from "./commands/HunkCommands";
import { FileCommands } from "./commands/FileCommands";
import { DiffService } from "./diff/DiffService";
import { WorkspaceBaselineStore } from "./session/WorkspaceBaselineStore";
import { ReviewSession } from "./session/ReviewSession";
import {
  BASELINE_SCHEME,
  BaselineContentProvider,
} from "./ui/BaselineContentProvider";
import { HunkCodeLensProvider } from "./ui/HunkCodeLensProvider";
import { SelectionCodeLensProvider } from "./ui/SelectionCodeLensProvider";
import { ChangeTreeProvider } from "./ui/ChangeTreeProvider";
import { ChangeStatusBar } from "./ui/ChangeStatusBar";

export function activate(context: vscode.ExtensionContext): void {
  const baselineStore = new WorkspaceBaselineStore();
  const diffs = new DiffService(baselineStore);
  const session = new ReviewSession(baselineStore, diffs);
  const baselineProvider = new BaselineContentProvider(baselineStore);
  const hunkCommands = new HunkCommands(
    baselineStore,
    diffs,
    session,
    baselineProvider,
  );
  const codeLensProvider = new HunkCodeLensProvider(diffs);
  const selectionCodeLensProvider = new SelectionCodeLensProvider();
  const treeProvider = new ChangeTreeProvider(diffs);
  const statusBar = new ChangeStatusBar(diffs);
  const fileCommands = new FileCommands(
    baselineStore,
    diffs,
    session,
    baselineProvider,
  );
  const baselineChangeSubscription = session.onDidAdvanceBaseline((uri) =>
    baselineProvider.refresh(uri),
  );
  let sessionStartInProgress = false;
  const startSession = async (): Promise<void> => {
    if (sessionStartInProgress) {
      void vscode.window.showInformationMessage(
        "Agent Review is already capturing a baseline.",
      );
      return;
    }

    sessionStartInProgress = true;
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Starting Agent Review session",
          cancellable: false,
        },
        (_progress, _token) =>
          session.start((message) => _progress.report({ message })),
      );
      void vscode.window.showInformationMessage(
        `Agent Review session started with ${result.fileCount} files using a ${result.kind} baseline.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(message);
    } finally {
      sessionStartInProgress = false;
    }
  };

  context.subscriptions.push(
    session,
    baselineProvider,
    codeLensProvider,
    selectionCodeLensProvider,
    treeProvider,
    statusBar,
    baselineChangeSubscription,
    vscode.window.createTreeView("cursorForgery.changes", {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    }),
    vscode.workspace.registerTextDocumentContentProvider(
      BASELINE_SCHEME,
      baselineProvider,
    ),
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      codeLensProvider,
    ),
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      selectionCodeLensProvider,
    ),
    vscode.commands.registerCommand("cursorForgery.startSession", startSession),
    vscode.commands.registerCommand(
      "cursorForgery.acceptHunk",
      (target, hunkId) => hunkCommands.acceptHunk(target, hunkId),
    ),
    vscode.commands.registerCommand(
      "cursorForgery.rejectHunk",
      (target, hunkId) => hunkCommands.rejectHunk(target, hunkId),
    ),
    vscode.commands.registerCommand(
      "cursorForgery.requestHunkChange",
      (target, hunkId) => hunkCommands.requestHunkChange(target, hunkId),
    ),
    vscode.commands.registerCommand(
      "cursorForgery.openHunkDiff",
      (target, hunkId) => hunkCommands.openHunkDiff(target, hunkId),
    ),
    vscode.commands.registerCommand(
      "cursorForgery.openHunk",
      (target, hunkId) => hunkCommands.openHunk(target, hunkId),
    ),
    vscode.commands.registerCommand("cursorForgery.acceptFile", (target) =>
      fileCommands.acceptFile(target),
    ),
    vscode.commands.registerCommand("cursorForgery.rejectFile", (target) =>
      fileCommands.rejectFile(target),
    ),
    vscode.commands.registerCommand("cursorForgery.acceptAll", () =>
      fileCommands.acceptAll(),
    ),
    vscode.commands.registerCommand("cursorForgery.rejectAll", () =>
      fileCommands.rejectAll(),
    ),
  );

  if (vscode.workspace.workspaceFolders?.length) {
    void startSession();
  }
}

export function deactivate(): void {}
