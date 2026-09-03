import * as vscode from "vscode";
import type { FileDiff } from "../model";
import type { BaselineStore } from "../session/BaselineStore";
import { computeHunks } from "./computeHunks";

export class DiffService implements vscode.Disposable {
  private readonly fileDiffs = new Map<string, FileDiff>();
  private readonly changeEmitter = new vscode.EventEmitter<void>();

  readonly onDidChange = this.changeEmitter.event;

  constructor(private readonly baselineStore: BaselineStore) {}

  getAll(): readonly FileDiff[] {
    return [...this.fileDiffs.values()].sort((a, b) =>
      a.uri.localeCompare(b.uri),
    );
  }

  get(uri: vscode.Uri): FileDiff | undefined {
    return this.fileDiffs.get(uri.toString());
  }

  getHunk(uri: vscode.Uri, hunkId: string) {
    return this.get(uri)?.hunks.find((hunk) => hunk.id === hunkId);
  }

  async recompute(uri: vscode.Uri): Promise<void> {
    try {
      const baseline = await this.baselineStore.get(uri);
      if (baseline === undefined) {
        return;
      }
      const document = await vscode.workspace.openTextDocument(uri);
      const hunks = computeHunks(uri.toString(), baseline, document.getText());
      if (hunks.length === 0) {
        this.fileDiffs.delete(uri.toString());
      } else {
        this.fileDiffs.set(uri.toString(), { uri: uri.toString(), hunks });
      }
    } catch {
      // Deleted, binary, and non-UTF-8 files are outside the current review scope.
      this.fileDiffs.delete(uri.toString());
    }

    this.changeEmitter.fire();
  }

  async recomputeAll(): Promise<void> {
    await Promise.all(this.baselineStore.uris().map((uri) => this.recompute(uri)));
  }

  clear(): void {
    if (this.fileDiffs.size === 0) {
      return;
    }
    this.fileDiffs.clear();
    this.changeEmitter.fire();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
