export interface DiffHunk {
  readonly id: string;
  readonly uri: string;
  readonly oldStartLine: number;
  readonly oldLineCount: number;
  readonly newStartLine: number;
  readonly newLineCount: number;
  readonly baselineStartOffset: number;
  readonly baselineEndOffset: number;
  readonly currentStartOffset: number;
  readonly currentEndOffset: number;
  readonly baselineText: string;
  readonly currentText: string;
}

export interface FileDiff {
  readonly uri: string;
  readonly hunks: readonly DiffHunk[];
}

export type AgentFileChangeKind = "modified" | "added" | "deleted";

export interface AgentFileChange extends FileDiff {
  readonly kind: AgentFileChangeKind;
}
