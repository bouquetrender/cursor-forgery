import { TextDecoder } from "util";
import * as vscode from "vscode";

export async function readTextFile(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (
      (stat.type & vscode.FileType.File) === 0 ||
      (stat.type & vscode.FileType.SymbolicLink) !== 0
    ) {
      return undefined;
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    if (bytes.includes(0)) {
      return undefined;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}
