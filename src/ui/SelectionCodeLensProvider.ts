import * as vscode from "vscode";

export class SelectionCodeLensProvider
  implements vscode.CodeLensProvider, vscode.Disposable
{
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  private readonly subscriptions: vscode.Disposable[];

  readonly onDidChangeCodeLenses = this.changeEmitter.event;

  constructor() {
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(() =>
        this.changeEmitter.fire(),
      ),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor === vscode.window.activeTextEditor) {
          this.changeEmitter.fire();
        }
      }),
    ];
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      editor.document !== document ||
      editor.selection.isEmpty ||
      !vscode.extensions.getExtension("openai.chatgpt")
    ) {
      return [];
    }

    const position = editor.selection.start;
    return [
      new vscode.CodeLens(new vscode.Range(position, position), {
        title: "$(comment-discussion) Add to Codex Thread",
        command: "chatgpt.addToThread",
      }),
      new vscode.CodeLens(new vscode.Range(position, position), {
        title: "$(file-add) Add File to Codex Thread",
        command: "chatgpt.addFileToThread",
        arguments: [document.uri],
      }),
    ];
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.dispose());
    this.changeEmitter.dispose();
  }
}
