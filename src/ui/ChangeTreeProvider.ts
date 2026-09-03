import * as vscode from "vscode";
import type { DiffService } from "../diff/DiffService";
import type { DiffHunk, FileDiff } from "../model";

export class FileChangeItem extends vscode.TreeItem {
  readonly contextValue = "cursorForgery.file";

  constructor(
    readonly uri: vscode.Uri,
    readonly fileDiff: FileDiff,
  ) {
    super(
      vscode.workspace.asRelativePath(uri),
      vscode.TreeItemCollapsibleState.Expanded,
    );
    this.resourceUri = uri;
    this.description = `${fileDiff.hunks.length} hunk${
      fileDiff.hunks.length === 1 ? "" : "s"
    }`;
    this.tooltip = uri.fsPath;
  }
}

export class HunkChangeItem extends vscode.TreeItem {
  readonly contextValue = "cursorForgery.hunk";

  constructor(
    readonly uri: vscode.Uri,
    readonly hunk: DiffHunk,
  ) {
    super(formatHunkLabel(hunk), vscode.TreeItemCollapsibleState.None);
    this.description = summarizeHunk(hunk);
    this.command = {
      command: "cursorForgery.openHunkDiff",
      title: "Show Hunk Diff",
      arguments: [uri.toString(), hunk.id],
    };
    this.iconPath = new vscode.ThemeIcon("diff");
  }

  get hunkId(): string {
    return this.hunk.id;
  }
}

type ChangeTreeItem = FileChangeItem | HunkChangeItem;

export class ChangeTreeProvider
  implements vscode.TreeDataProvider<ChangeTreeItem>, vscode.Disposable
{
  private readonly changeEmitter = new vscode.EventEmitter<
    ChangeTreeItem | undefined | void
  >();
  private readonly diffSubscription: vscode.Disposable;

  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly diffs: DiffService) {
    this.diffSubscription = diffs.onDidChange(() => this.changeEmitter.fire());
  }

  getTreeItem(element: ChangeTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ChangeTreeItem): ChangeTreeItem[] {
    if (!element) {
      return this.diffs.getAll().map((fileDiff) => {
        const uri = vscode.Uri.parse(fileDiff.uri);
        return new FileChangeItem(uri, fileDiff);
      });
    }

    if (element instanceof FileChangeItem) {
      return element.fileDiff.hunks.map(
        (hunk) => new HunkChangeItem(element.uri, hunk),
      );
    }

    return [];
  }

  dispose(): void {
    this.diffSubscription.dispose();
    this.changeEmitter.dispose();
  }
}

function formatHunkLabel(hunk: DiffHunk): string {
  return `@@ -${hunk.oldStartLine + 1},${hunk.oldLineCount} +${
    hunk.newStartLine + 1
  },${hunk.newLineCount} @@`;
}

function summarizeHunk(hunk: DiffHunk): string {
  const candidate = hunk.currentText || hunk.baselineText;
  const firstLine = candidate.split(/\r?\n/, 1)[0].trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}
