import type { AgentFileChange, DiffHunk, FileDiff } from "../model";

const CHANGE_KIND_ORDER: Readonly<Record<AgentFileChange["kind"], number>> = {
  modified: 0,
  added: 1,
  deleted: 2,
};

export class AgentChangeHistory {
  private readonly hunksByUri = new Map<string, Map<number, DiffHunk>>();
  private readonly wholeFileChanges = new Map<string, AgentFileChange>();

  record(fileDiff: FileDiff): void {
    let hunks = this.hunksByUri.get(fileDiff.uri);
    if (!hunks) {
      hunks = new Map<number, DiffHunk>();
      this.hunksByUri.set(fileDiff.uri, hunks);
    }

    for (const hunk of fileDiff.hunks) {
      hunks.set(hunk.oldStartLine, hunk);
    }
  }

  recordWholeFile(uri: string, kind: "added" | "deleted"): void {
    this.wholeFileChanges.set(`${kind}:${uri}`, { uri, kind, hunks: [] });
  }

  hasWholeFile(uri: string, kind: "added" | "deleted"): boolean {
    return this.wholeFileChanges.has(`${kind}:${uri}`);
  }

  getAll(): readonly AgentFileChange[] {
    const modified = [...this.hunksByUri.entries()]
      .map(([uri, hunks]) => ({
        uri,
        kind: "modified" as const,
        hunks: [...hunks.values()].sort(
          (a, b) =>
            a.newStartLine - b.newStartLine || a.id.localeCompare(b.id),
        ),
      }));
    return [...modified, ...this.wholeFileChanges.values()].sort(
      (a, b) =>
        a.uri.localeCompare(b.uri) ||
        CHANGE_KIND_ORDER[a.kind] - CHANGE_KIND_ORDER[b.kind],
    );
  }

  getHunk(uri: string, hunkId: string): DiffHunk | undefined {
    return [...(this.hunksByUri.get(uri)?.values() ?? [])].find(
      (hunk) => hunk.id === hunkId,
    );
  }

  clear(): void {
    this.hunksByUri.clear();
    this.wholeFileChanges.clear();
  }
}
