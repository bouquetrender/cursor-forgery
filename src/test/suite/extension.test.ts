import * as assert from "assert";
import { readFileSync } from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { MemoryBaselineStore } from "../../session/MemoryBaselineStore";
import { WorkspaceBaselineStore } from "../../session/WorkspaceBaselineStore";

const ORIGINAL = "alpha\nbeta\ngamma\n";
const MODIFIED = "alpha\nBETA\ngamma\n";
const SECOND_ORIGINAL = "red\ngreen\nblue\n";
const SECOND_MODIFIED = "red\nGREEN\nblue\n";

suite("Agent Diff Review extension", () => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);
  const sampleUri = vscode.Uri.joinPath(workspaceFolder.uri, "sample.txt");
  const secondUri = vscode.Uri.joinPath(workspaceFolder.uri, "second.txt");

  setup(async () => {
    await replaceAndSave(sampleUri, ORIGINAL);
    await replaceAndSave(secondUri, SECOND_ORIGINAL);
    await vscode.commands.executeCommand("cursorForgery.startSession");
  });

  teardown(async () => {
    await replaceAndSave(sampleUri, ORIGINAL);
    await replaceAndSave(secondUri, SECOND_ORIGINAL);
  });

  test("registers the complete review command set", async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      "cursorForgery.startSession",
      "cursorForgery.openHunkDiff",
      "cursorForgery.acceptHunk",
      "cursorForgery.rejectHunk",
      "cursorForgery.acceptFile",
      "cursorForgery.rejectFile",
      "cursorForgery.acceptAll",
      "cursorForgery.rejectAll",
    ]) {
      assert.ok(commands.includes(command), `${command} is not registered`);
    }
  });

  test("uses an isolated mutable Git tree without changing the real index", async () => {
    const store = new WorkspaceBaselineStore();
    const realIndexPath = path.join(workspaceFolder.uri.fsPath, ".git", "index");
    const realIndexBefore = readFileSync(realIndexPath);

    await store.capture({ uris: [sampleUri, secondUri] });
    assert.strictEqual(store.kind, "git");
    assert.strictEqual(await store.get(sampleUri), ORIGINAL);

    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    assert.strictEqual(await store.get(sampleUri), ORIGINAL);
    await store.set(sampleUri, MODIFIED);
    assert.strictEqual(await store.get(sampleUri), MODIFIED);
    assert.deepStrictEqual(readFileSync(realIndexPath), realIndexBefore);
    store.clear();
  });

  test("retains the memory store as a non-Git fallback", async () => {
    const store = new MemoryBaselineStore();
    await store.capture({ uris: [sampleUri] });

    assert.strictEqual(store.kind, "memory");
    assert.strictEqual(await store.get(sampleUri), ORIGINAL);
    await store.set(sampleUri, MODIFIED);
    assert.strictEqual(await store.get(sampleUri), MODIFIED);
    store.clear();
  });

  test("detects a saved change and exposes review actions", async () => {
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    await waitForWatcher();
    const document = await vscode.workspace.openTextDocument(sampleUri);
    const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      "vscode.executeCodeLensProvider",
      sampleUri,
    );

    assert.strictEqual(lenses.length, 3);
    assert.deepStrictEqual(
      lenses.map((lens) => lens.command?.command),
      [
        "cursorForgery.openHunkDiff",
        "cursorForgery.acceptHunk",
        "cursorForgery.rejectHunk",
      ],
    );

    const reject = lenses[2].command;
    assert.ok(reject?.arguments);
    await vscode.commands.executeCommand(reject.command, ...reject.arguments);
    assert.strictEqual(document.getText(), ORIGINAL);
  });

  test("accept updates the baseline without changing the current file", async () => {
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    await waitForWatcher();
    const before = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      "vscode.executeCodeLensProvider",
      sampleUri,
    );
    const accept = before[1].command;
    assert.ok(accept?.arguments);

    await vscode.commands.executeCommand(accept.command, ...accept.arguments);

    const document = await vscode.workspace.openTextDocument(sampleUri);
    assert.strictEqual(document.getText(), MODIFIED);
    const after = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      "vscode.executeCodeLensProvider",
      sampleUri,
    );
    assert.strictEqual(after.length, 0);
  });

  test("does not review edits typed by the user", async () => {
    const document = await vscode.workspace.openTextDocument(sampleUri);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(sampleUri, document.lineAt(1).range, "USER BETA");

    await vscode.workspace.applyEdit(edit);
    await waitForUserBaseline();
    await document.save();
    await waitForWatcher();

    assert.strictEqual(document.getText(), "alpha\nUSER BETA\ngamma\n");
    assert.strictEqual((await getCodeLenses(sampleUri)).length, 0);
  });

  test("user editing a pending file takes ownership of its current state", async () => {
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    await waitForWatcher();
    assert.strictEqual((await getCodeLenses(sampleUri)).length, 3);
    const document = await vscode.workspace.openTextDocument(sampleUri);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(sampleUri, document.positionAt(document.getText().length), "user line\n");

    await vscode.workspace.applyEdit(edit);
    await waitForNoCodeLenses(sampleUri);

    assert.strictEqual((await getCodeLenses(sampleUri)).length, 0);
  });

  test("opens a native diff with baseline and current documents", async () => {
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    await waitForWatcher();
    const lens = (await getCodeLenses(sampleUri))[0];
    assert.ok(lens.command?.arguments);

    await vscode.commands.executeCommand(
      "cursorForgery.openHunkDiff",
      ...lens.command.arguments,
    );

    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    assert.ok(input instanceof vscode.TabInputTextDiff);
    assert.strictEqual(input.original.scheme, "agent-review-baseline");
    assert.strictEqual(input.modified.toString(), sampleUri.toString());
  });

  test("reject file restores every hunk through a workspace edit", async () => {
    const twoHunks = "ALPHA\nbeta\nGAMMA\n";
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(twoHunks));
    await waitForWatcher();
    assert.strictEqual((await getCodeLenses(sampleUri)).length, 6);

    await vscode.commands.executeCommand("cursorForgery.rejectFile", sampleUri);

    const document = await vscode.workspace.openTextDocument(sampleUri);
    assert.strictEqual(document.getText(), ORIGINAL);
    assert.strictEqual((await getCodeLenses(sampleUri)).length, 0);
  });

  test("accept all advances baselines for multiple files", async () => {
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    await vscode.workspace.fs.writeFile(secondUri, Buffer.from(SECOND_MODIFIED));
    await waitForWatcher();
    assert.strictEqual((await getCodeLenses(sampleUri)).length, 3);
    assert.strictEqual((await getCodeLenses(secondUri)).length, 3);

    await vscode.commands.executeCommand("cursorForgery.acceptAll");

    assert.strictEqual((await getCodeLenses(sampleUri)).length, 0);
    assert.strictEqual((await getCodeLenses(secondUri)).length, 0);
    assert.strictEqual((await vscode.workspace.openTextDocument(sampleUri)).getText(), MODIFIED);
    assert.strictEqual(
      (await vscode.workspace.openTextDocument(secondUri)).getText(),
      SECOND_MODIFIED,
    );
  });

  test("reject all restores multiple files", async () => {
    await vscode.workspace.fs.writeFile(sampleUri, Buffer.from(MODIFIED));
    await vscode.workspace.fs.writeFile(secondUri, Buffer.from(SECOND_MODIFIED));
    await waitForWatcher();

    await vscode.commands.executeCommand("cursorForgery.rejectAll");

    assert.strictEqual(
      (await vscode.workspace.openTextDocument(sampleUri)).getText(),
      ORIGINAL,
    );
    assert.strictEqual(
      (await vscode.workspace.openTextDocument(secondUri)).getText(),
      SECOND_ORIGINAL,
    );
    assert.strictEqual((await getCodeLenses(sampleUri)).length, 0);
    assert.strictEqual((await getCodeLenses(secondUri)).length, 0);
  });
});

async function waitForWatcher(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
}

async function waitForUserBaseline(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
}

async function waitForNoCodeLenses(uri: vscode.Uri): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if ((await getCodeLenses(uri)).length === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function getCodeLenses(uri: vscode.Uri): Promise<vscode.CodeLens[]> {
  return vscode.commands.executeCommand<vscode.CodeLens[]>(
    "vscode.executeCodeLensProvider",
    uri,
  );
}

async function replaceAndSave(uri: vscode.Uri, content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    uri,
    new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    ),
    content,
  );
  await vscode.workspace.applyEdit(edit);
  await document.save();
}
