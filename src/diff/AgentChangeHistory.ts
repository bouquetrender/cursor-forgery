import type { DiffHunk, FileDiff } from "../model";

export class AgentChangeHistory {
  private readonly hunksByUri = new Map<string, Map<number, DiffHunk>>();

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

  getAll(): readonly FileDiff[] {
    return [...this.hunksByUri.entries()]
      .map(([uri, hunks]) => ({
        uri,
        hunks: [...hunks.values()].sort(
          (a, b) =>
            a.newStartLine - b.newStartLine || a.id.localeCompare(b.id),
        ),
      }))
      .sort((a, b) => a.uri.localeCompare(b.uri));
  }

  getHunk(uri: string, hunkId: string): DiffHunk | undefined {
    return [...(this.hunksByUri.get(uri)?.values() ?? [])].find(
      (hunk) => hunk.id === hunkId,
    );
  }

  clear(): void {
    this.hunksByUri.clear();
  }
}
