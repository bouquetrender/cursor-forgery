import * as vscode from "vscode";
import type { FileDiff } from "../model";
import type { BaselineStore } from "../session/BaselineStore";
import { AgentChangeHistory } from "./AgentChangeHistory";
import { computeHunks } from "./computeHunks";

export class DiffService implements vscode.Disposable {
  private readonly fileDiffs = new Map<string, FileDiff>();
  private readonly history = new AgentChangeHistory();
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

  getAllAgentChanges(): readonly FileDiff[] {
    return this.history.getAll();
  }

  getHunk(uri: vscode.Uri, hunkId: string) {
    return this.get(uri)?.hunks.find((hunk) => hunk.id === hunkId);
  }

  getHistoricalHunk(uri: vscode.Uri, hunkId: string) {
    return this.history.getHunk(uri.toString(), hunkId);
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
        const fileDiff = { uri: uri.toString(), hunks };
        this.fileDiffs.set(uri.toString(), fileDiff);
        this.history.record(fileDiff);
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
    if (this.fileDiffs.size === 0 && this.history.getAll().length === 0) {
      return;
    }
    this.fileDiffs.clear();
    this.history.clear();
    this.changeEmitter.fire();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
