# cursor-forgery

[English](README.md) | [简体中文](README.zh-CN.md)

`cursor-forgery` 是一个模仿 Cursor 交互操作的 VS Code 扩展插件，用于审查 Agent 对代码文件的修改，也可快速将代码选区或整个文件加入 Codex 对话。插件不调用任何 API，也不会修改 Agent 的工作方式。

## 使用流程

1. 运行 **Agent Review: Start Session** 捕获基线。
2. 让 Codex、Claude 或其他 Agent 修改工作区文件。
3. 在资源管理器中打开 **AGENT CHANGES**。
4. 点击文件或变更块，打开当前文件并定位到对应代码行。
5. 使用树视图或 CodeLens 接受、拒绝或请求修改。

## 侧边栏

- **Current Turn**：尚未处理的变更。Accept 或 Reject 后会消失。
- **All Agent Changes**：当前会话的只读历史，默认收起。同一位置的新变更会覆盖旧记录；新会话开始时清空。

## 审查操作

- `Accept`：保留当前代码，并推进基线。
- `Reject`：用基线内容恢复代码。
- `Request Change`：选中变更代码并加入 Codex 对话。

在 VS Code 中手动编辑文件会接管当前文件：扩展会更新基线并清除该文件的待审查变更。

## Codex 上下文

安装官方 Codex 扩展后，选中代码即可使用 `Add to Codex Thread` 和
`Add File to Codex Thread`，将选区或整个文件加入 Codex 对话。

## 命令

- `Agent Review: Start Session`
- `Agent Review: Open Change`
- `Agent Review: View Before ↔ After`
- `Agent Review: Accept Hunk`
- `Agent Review: Reject Hunk`
- `Agent Review: Request Change`
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

按 `F5` 启动扩展开发宿主。需要 VS Code 1.85+；开发依赖支持 Node 16.20.1。

## 当前范围

- 仅支持已存在的 UTF-8 文本文件。
- 暂不支持新增、删除、重命名、二进制和非 UTF-8 文件。
- Git 工作区使用隔离的临时环境，不会修改真实索引或暂存区。
- 非 Git 和多根工作区使用内存基线。
- 直接写入文件系统视为 Agent 修改；使 VS Code 文档变为未保存状态的操作视为用户修改。
