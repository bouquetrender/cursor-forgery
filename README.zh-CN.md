# cursor-forgery

[English](README.md) | [简体中文](README.zh-CN.md)

`cursor-forgery` 是一个模仿 Cursor 交互操作的 VS Code 扩展。它提供代码选区和
整文件的一键 Codex 上下文操作，同时支持审查外部编程智能体对文本文件所做的更改。
它不会调用 AI API，也不会改变智能体的工作方式。

## 使用流程

1. 从命令面板运行 **Agent Review: Start Session**。
2. 让 Codex、Claude 或其他工具编辑当前工作区中的文件。
3. 在资源管理器中打开 **AGENT CHANGES**。
4. 选择一个变更块，在对应变更位置打开 VS Code 原生差异编辑器。
5. 使用变更行上方 CodeLens 中的 `Accept` / `Reject`，或使用树视图和命令面板中的
   文件级/全部操作命令。

安装并启用官方 Codex 扩展后，在编辑器中选择代码，选区起始行上方会显示
`Add to Codex Thread` 和 `Add File to Codex Thread`。点击即可分别把当前选区或
整个文件加入 Codex，无需打开右键菜单。

接受变更块时，当前文件保持不变，仅推进基线中的对应部分。拒绝变更块时，则通过
`WorkspaceEdit` 恢复基线文本。每次操作都会重新计算受影响文件的所有变更块。

在 VS Code 中直接输入的编辑会被视为用户自己的工作，并自动推进基线，而不会创建待审查的
变更块。如果文件中已有待处理的智能体变更，编辑该文件即表示用户接管其完整的当前状态，
并清除这些待处理的变更块。

## 命令

- `Agent Review: Start Session`
- `Agent Review: View Before ↔ After`
- `Agent Review: Accept Hunk`
- `Agent Review: Reject Hunk`
- `Agent Review: Accept File`
- `Agent Review: Reject File`
- `Agent Review: Accept All`
- `Agent Review: Reject All`

## 开发

```sh
npm install
npm run compile
npm run test:unit
npm run test:integration
```

在 VS Code 中按 `F5` 启动扩展开发宿主。该扩展兼容 VS Code 1.85 及更高版本；锁定版本的
开发依赖也可在 Node 16.20.1 中运行。

## 当前范围

- Git 工作区使用隔离的临时索引、对象目录和工作树，绝不会更改真实的 Git 索引和暂存区。
- Git 文件发现依赖仓库索引和忽略规则。临时索引以真实索引的副本为起点，因此未更改的文件可
  复用 Git 的状态缓存；启动时无需读取每个文件的内容。
- 非 Git 工作区和多根工作区会通过同一个 `BaselineStore` 接口回退到内存基线。
- 支持现有的 UTF-8 文本文件。
- 使用带防抖机制的 `FileSystemWatcher` 检测文件变更。
- 暂不审查新增、删除、重命名、二进制及非 UTF-8 文件。
- VS Code 的稳定版 API 不会暴露编辑器的身份。使 VS Code 文档进入未保存状态的变更会被视为
  用户编辑，直接写入文件系统则会被视为智能体编辑。因此，用户在其他编辑器中的保存操作会
  作为外部变更接受审查，而其他 VS Code 扩展通过 `WorkspaceEdit` 产生的变更会被视为源自用户。
