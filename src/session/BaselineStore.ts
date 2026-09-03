import type { Uri } from "vscode";

export interface BaselineCaptureOptions {
  readonly uris?: readonly Uri[];
  readonly report?: (message: string) => void;
}

export interface BaselineStore {
  readonly kind: "git" | "memory";
  capture(options?: BaselineCaptureOptions): Promise<void>;
  clear(): void;
  has(uri: Uri): boolean;
  get(uri: Uri): Promise<string | undefined>;
  set(uri: Uri, content: string): Promise<void>;
  uris(): readonly Uri[];
}
