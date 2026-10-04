# PRISM — 垂直切片实施计划

**版本：** 0.2.0-alpha  
**基于：** PRISM_PROJECT.md 规约 v0.1.0-alpha  
**状态：** 从当前代码库状态出发，端到端补全所有缺失功能  

---

## 0. 当前代码基线快照

**已具备（可直接复用）：**
- Electron 29 + React 19 + TypeScript 5.8 骨架
- Tailwind CSS 4 + Vite 构建链
- 基础布局组件（Topbar / GridViewport / InspectorPanel / ConsoleTray）— 全部内联于 App.tsx
- IPC 通信骨架（preload + ipcMain 基础 handler）
- `chokidar` 文件监听 + `helm-doc-changed` IPC 推送
- `scanHelmDocs()` — 扫描 7 个文档
- `atomicUpdateProgress()` — Markdown 表格状态原子写入
- `classifyIntent()` — 本地关键词意图分类
- MCP Server SSE 骨架（端口 1436，`prism_ask_user` 单工具）
- 单元测试框架（Vitest）+ 4 组现有测试

**严重缺失（本计划需补全）：**
- Zustand 状态管理（全部用 useState 内联）
- System Prompt 模板体系（`electron/helm/system-prompts/` 目录不存在）
- QUESTION 格式解析引擎（`parseQuestionBlocks()` 不存在）
- 完整 IDEAdapter 接口实现（detect / injectSystemPrompt / openSession / sendMessage / getProjectRoot）
- Cursor / Windsurf 适配器（完全不存在）
- 项目初始化 + 迁移流程（`DocManager.initialize()` / `migrate()`）
- Git Hook 安装
- Helm 规范违反检测器（`violation-detector.ts`）
- 上下文快满检测 + ADR 自动保存
- 文档命名与路径对齐规约（当前用 `Helm/docs/PROGRESS.md`，规约要求 `docs/PRODUCT.md` + `TASK.md`）

---

## 1. 切片设计原则

```
1. 垂直而非水平：每个切片必须包含 UI → 状态管理 → 主进程逻辑 → 文件系统操作
2. 端到端可演示：切片完成后，非技术用户能看到完整功能跑通
3. TDD 先行：每个切片先写失败测试，再写最小实现
4. 不预先建数据模型：禁止"先定义所有类型，下一切片再做 UI"
5. 规约唯一权威：所有实现严格以 PRISM_PROJECT.md 为准
```

---

## 2. 切片总览与依赖图

```
切片 A: 文档对齐 + Zustand 重构
    │
    ▼
切片 B: System Prompt 模板引擎 + CLAUDE.md 注入
    │
    ▼
切片 C: QUESTION 解析引擎 + 弹窗队列管理
    │
    ▼
切片 D: Claude Code 完整适配器（MCP 4 工具 + 全接口）
    │         ┌──────────────────────────────────────┐
    │         ▼                                      ▼
    ▼   切片 E: 意图 → Claude Code 全流程联通    切片 F: 项目初始化 + 迁移
    │         │                                      │
    │         ▼                                      ▼
    │   切片 G: Helm 规范违反检测              切片 H: TASK.md 状态控制台
    │         │                                      │
    │         └──────────────┬───────────────────────┘
    │                        ▼
    │                   切片 I: Cursor 适配器
    │                        │
    │                        ▼
    │                   切片 J: Windsurf 适配器
    │                        │
    │                        ▼
    │                   切片 K: 上下文快满 + ADR 弹窗
    │                        │
    │                        ▼
    │                   切片 L: Antigravity 适配器完善
    │                        │
    │                        ▼
    └─────────────────> 切片 M: E2E 测试套件 + 集成验收
```

---

## 3. 切片详细规约

---

### 切片 A：文档命名对齐 + Zustand 状态管理重构

**目标：** 统一代码中所有文档命名、路径、状态枚举与 PRISM_PROJECT.md 规约一致；引入 Zustand 替代内联 useState。

**端到端验收：**
1. 打开 Prism，选择一个本地项目
2. Grid 中 7 张卡片按规约命名显示（`PRODUCT.md` 替代 `PROGRESS.md`，`TASK.md` 保留，`HANDOFF.md` 新增为第 8 张）
3. 点击卡片 → Inspector 打开 → 内容正确渲染
4. 外部编辑器修改 `docs/TASK.md` → 1 秒内 Grid 对应卡片刷新（不闪屏）
5. 打开第二个 Prism 窗口 → 选择另一个项目 → 两个窗口状态完全隔离

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 数据类型 | `src/types/helm.ts` | 统一 `DocStatus` 为规约 5 种：`ACTIVE \| LOCKED \| PENDING \| EMPTY \| STALE`。统一 `HelmDoc` 接口 |
| 状态管理 | `src/store/session.ts` | Zustand store：`PrismSession` 数组，含 `id / ideSessionId / workflowPhase / taskType / projectRoot / windowId` |
| 状态管理 | `src/store/helm-docs.ts` | Zustand store：`HelmDoc[]`，支持 `updateDoc(title, partial)` |
| 状态管理 | `src/store/ui.ts` | Zustand store：`selectedCardId / inspectorOpen / consoleExpanded / activeModal` |
| 主进程 | `electron/doc-manager/scanner.ts` | 扫描路径从 `Helm/docs/` 改为 `docs/`；文档列表对齐规约（新增 `HANDOFF.md`，`PROGRESS.md` → `PRODUCT.md`，移除 `ARCHITECTURE.md`） |
| 主进程 | `electron/doc-manager/watcher.ts` | 监听路径同步改为 `docs/**/*.md` + `TASK.md` + `HANDOFF.md` |
| 主进程 | `electron/main.ts` | 多窗口 Session 映射：`sessions: Map<string, BrowserWindow>` → 每个窗口有独立 `sessionId` |
| 渲染进程 | `src/App.tsx` | 用 `useStore` 替换所有 `useState`，删除内联状态逻辑 |
| 渲染进程 | `src/components/cards/DocCard.tsx` | 从 App.tsx 抽离为独立组件 |
| 渲染进程 | `src/components/cards/TaskProgressCard.tsx` | TASK.md 专用卡片，含进度条（从 App.tsx 抽离） |

**测试：**
- 单元：给定空目录，8 张卡片全部 `EMPTY`；给定有 `docs/TASK.md` 的目录，`TASK.md` 卡片为 `ACTIVE`
- 单元：Zustand store `updateDoc` 后，订阅组件正确重渲染
- 集成：打开两个窗口，分别选择不同目录，验证 `scan_helm_docs` 返回各自独立结果

**工期：** 1 天  
**HITL 决策点：** 无（纯重构，AFK）

---

### 切片 B：System Prompt 模板引擎 + CLAUDE.md 注入

**目标：** Prism 能根据当前工作流阶段，向项目根目录注入对应的 Helm System Prompt 模板。

**端到端验收：**
1. 打开 Prism，选择项目
2. Console Tray 显示：`SYSTEM: 正在注入 Helm 规范到 CLAUDE.md...`
3. 项目根目录生成 `CLAUDE.md`，内容包含当前阶段对应的约束模板
4. 切换工作流阶段（如从 explore → design）→ `CLAUDE.md` 自动更新对应章节
5. 再次打开同一项目 → Prism 检测到已有 `CLAUDE.md` → 追加模式更新（不覆盖用户手动修改）

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 模板资源 | `electron/helm/system-prompts/explore.md` | Phase 1 explore 规范模板（含 QUESTION 格式约束、阶段切换规范） |
| 模板资源 | `electron/helm/system-prompts/grill.md` | Phase 1/2 grill 收敛模板 |
| 模板资源 | `electron/helm/system-prompts/design.md` | Phase 2 design 模板 |
| 模板资源 | `electron/helm/system-prompts/slice.md` | Phase 2 slice 模板 |
| 模板资源 | `electron/helm/system-prompts/code.md` | Phase 3 code 模板（TDD 约束、垂直切片约束） |
| 模板资源 | `electron/helm/system-prompts/debug.md` | Phase 5 debug 模板 |
| 模板引擎 | `electron/helm/template-engine.ts` | `renderSystemPrompt(phase: HelmPhase, context: ContextData): string` — 读取对应 .md 模板，替换 `{{taskType}}` / `{{currentPhase}}` / `{{contextSummary}}` / `{{taskSummary}}` |
| 主进程 | `electron/adapters/interface.ts` | 扩展 `IDEAdapter` 接口：增加 `injectSystemPrompt(prompt: string, mode: 'override' \| 'append'): Promise<void>` |
| 主进程 | `electron/adapters/claude-code.ts` | 实现 `injectSystemPrompt`：写入项目根目录 `CLAUDE.md`；`mode: 'override'` 时全量覆盖，`'append'` 时在 `## 当前任务上下文` 章节处替换 |
| 渲染进程 | `src/App.tsx` | 项目加载完成后，自动触发 `invoke('inject_system_prompt', { phase, projectRoot })` |
| 渲染进程 | `src/components/layout/ConsoleTray.tsx` | 从 App.tsx 抽离；显示注入日志 |

**测试：**
- 单元：`renderSystemPrompt('explore', mockContext)` 返回的字符串包含 `[[PRISM_QUESTION]]` 格式说明
- 单元：`renderSystemPrompt` 正确替换所有 mustache 变量
- 集成：调用 `injectSystemPrompt` 后，文件系统存在 `CLAUDE.md` 且包含预期内容
- 集成：`append` 模式下，用户手动添加的内容保留，只有 `## 当前任务上下文` 章节被更新

**工期：** 1.5 天  
**HITL 决策点：** D-004 — `CLAUDE.md` 写入位置：项目级（每个项目一个）vs 用户级（全局共享）。**本切片采用项目级**（更安全，符合规约），如果后续需要用户级可在切片 K 后追加切换逻辑。

---

### 切片 C：QUESTION 格式解析引擎 + 弹窗队列管理

**目标：** 从任意文本中提取 `[[PRISM_QUESTION]]` 块，解析为结构化数据；弹窗队列确保一次只显示一个 QUESTION。

**端到端验收：**
1. 在 Console Tray 粘贴一段包含 3 个 `[[PRISM_QUESTION]]` 块的模拟 IDE 输出
2. Prism 检测到后，依次弹出 3 个弹窗（第一个弹窗关闭后才显示第二个）
3. 第一个弹窗是 `choice` 类型 → 显示 3 张水平卡片
4. 第二个弹窗是 `confirm` 类型 → 显示"确认/调整"两个按钮
5. 第三个弹窗是 `input` 类型 → 显示文本框 + 提交按钮
6. 每个弹窗关闭后，Console Tray 记录用户选择结果

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 解析引擎 | `electron/helm/question-parser.ts` | `parseQuestionBlocks(raw: string): PrismQuestion[]` — 正则提取 `[[PRISM_QUESTION]]...[\/PRISM_QUESTION]]`，内部 YAML 用 `yaml.parse` 解析 |
| 解析引擎 | `electron/helm/question-parser.ts` | 容错：格式不完整时不崩溃；被 Markdown 代码块包裹时自动剥离 ``` |
| 队列管理 | `src/store/modal-queue.ts` | Zustand store：`queue: PrismQuestion[]`，`enqueue(q)` / `dequeue()` / `current()` |
| 弹窗组件 | `src/components/modals/ChoiceModal.tsx` | 从 `DecisionPanel.tsx` 抽离；3 张水平卡片布局（非 grid-cols-3） |
| 弹窗组件 | `src/components/modals/ConfirmModal.tsx` | 从 `DecisionPanel.tsx` 抽离；两个按钮，右侧为主操作 |
| 弹窗组件 | `src/components/modals/InputModal.tsx` | 从 `DecisionPanel.tsx` 抽离；文本框 + Cancel/Submit |
| 弹窗组件 | `src/components/modals/MultiSelectModal.tsx` | 从 `DecisionPanel.tsx` 抽离；多选卡片组 + Confirm 按钮 |
| 弹窗调度 | `src/components/modals/ModalLayer.tsx` | 根据 `modalQueue.current()?.type` 渲染对应组件；`onAnswer` 时 `dequeue()` |
| 渲染进程 | `src/App.tsx` | 替换内联 `DecisionPanel` 为 `<ModalLayer />`；监听 `show-question-modal` 事件 `enqueue` |

**测试（必须覆盖规约 9.2 中的 5 个 case）：**
```typescript
describe('parseQuestionBlocks', () => {
  it('解析标准 choice 格式');
  it('解析多个连续 QUESTION 块');
  it('空字符串输入返回空数组');
  it('格式不完整时优雅降级（不崩溃）');
  it('LLM 包裹 Markdown 代码块时正确剥离');
});
```

**工期：** 1.5 天  
**HITL 决策点：** 无

---

### 切片 D：Claude Code 完整适配器（MCP 4 工具 + 全接口）

**目标：** `ClaudeCodeAdapter` 实现规约要求的完整 `IDEAdapter` 接口，MCP Server 提供全部 4 个工具。

**端到端验收：**
1. 启动 Prism，选择项目
2. Console Tray 显示：`SYSTEM: 已检测到 Claude Code（MCP 模式）`
3. `CLAUDE.md` 注入成功
4. 点击"打开新 Session" → Prism 创建新窗口，Console 显示 `SESSION: {id} opened`
5. 向该 session 发送测试消息 → Claude Code 开始处理
6. Claude Code 输出包含 `[[PRISM_QUESTION]]` → Prism 弹窗显示
7. 用户点击选项 → 答案通过 MCP `prism_ask_user` 返回到 Claude Code

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 接口定义 | `electron/adapters/interface.ts` | 完整接口：增加 `detect()`, `injectSystemPrompt()`, `openSession()`, `sendMessage()`, `getProjectRoot()` |
| 适配器 | `electron/adapters/claude-code.ts` | `detect()`: 执行 `claude --version`，检查 PATH 和返回码 |
| 适配器 | `electron/adapters/claude-code.ts` | `injectSystemPrompt()`: 调用模板引擎渲染后写入 `CLAUDE.md` |
| 适配器 | `electron/adapters/claude-code.ts` | `openSession()`: 通过 MCP `prism_open_session` 或写入 `.ai/prism-session.json` 触发 Claude Code 读取；返回 sessionId |
| 适配器 | `electron/adapters/claude-code.ts` | `sendMessage()`: 向指定 session 的输入队列写入消息（轮询 `.ai/prism-inbox.md` 或 MCP） |
| 适配器 | `electron/adapters/claude-code.ts` | `getProjectRoot()`: 读取 Claude Code 当前工作目录（通过 `claude config get projectRoot` 或环境变量） |
| MCP 工具 | `electron/adapters/claude-code.ts` | `prism_read_context`: 读取 `docs/` 下所有 .md 摘要，返回 JSON |
| MCP 工具 | `electron/adapters/claude-code.ts` | `prism_write_decision`: 接收决策内容，追加写入 `docs/adr/ADR-{timestamp}.md` |
| MCP 工具 | `electron/adapters/claude-code.ts` | `prism_ask_user`: 已有，完善为通过 IPC 发送给渲染进程并等待 Promise resolve |
| MCP 工具 | `electron/adapters/claude-code.ts` | `prism_update_task`: 调用 `atomicUpdateProgress` 更新 `TASK.md` 切片状态 |
| 适配器 | `electron/adapters/claude-code.ts` | `watchOutput()`: 轮询 `.ai/prism-outbox.md`（500ms 间隔）+ diff 策略，检测到新内容后 `parseQuestionBlocks`，将 QUESTION 块通过 callback 发送 |
| 端口管理 | `electron/adapters/claude-code.ts` | MCP Server 端口：优先 1436，冲突时尝试 1437-1440，若全部占用则抛错并 Console 提示用户 |
| 渲染进程 | `src/components/layout/Topbar.tsx` | IDE 切换下拉框仅显示已 detect 成功的 IDE（灰色显示未检测到的） |
| 渲染进程 | `src/App.tsx` | 新增 "+ 新任务" 按钮，调用 `adapter.openSession()` |

**测试：**
- 单元：`detect()` mock `child_process.exec` 返回成功/失败
- 单元：MCP Server 4 个工具的 JSON Schema 符合规约
- 集成：启动 Prism → 验证 `http://localhost:1436/sse` 可连接
- 集成：向 MCP Server 发送 `prism_read_context` 请求，返回正确格式
- E2E：完整 roundtrip（sendMessage → watchOutput 检测到 QUESTION → 弹窗 → answer → Claude Code 收到答案）

**工期：** 3 天  
**HITL 决策点：**
- D-003：MCP Server 端口冲突策略 — **本切片采用动态分配（1436-1440）**
- D-004：`CLAUDE.md` 项目级 — **已确认**
- 首次联通时需要用户实际操作验证 Claude Code 响应

---

### 切片 E：意图输入 → Claude Code Session 创建 + QUESTION 弹窗全流程联通

**目标：** 用户输入意图后，Prism 自动完成从分类、开窗口、注入 prompt、监听输出、弹窗交互、发回答案的完整闭环。

**端到端验收：**
1. 在 Topbar 输入"加一个退出登录按钮"
2. Prism 显示静默推演提示（2 秒）：`SYSTEM: Analyzing intent → routing to /plobi-explore`
3. 静默提示消失后，新 BrowserWindow 打开，标题"新功能：加一个退出登录按钮"
4. Console Tray 显示：`INTENT 新功能意图... → 路由到 /plobi-explore`
5. 工作流进度指示器（Topbar 右侧）显示：`[● Phase 1: 需求探索] → [○ Phase 2: 方案设计] → ...`
6. Claude Code 输出第一个 QUESTION → Prism 弹出 choice 弹窗
7. 用户点击选项 A → Console 显示 `HELM 用户选择：A. ...`
8. 答案发回 Claude Code → Claude Code 继续执行
9. `TASK.md` 被外部更新 → Grid 中 TASK.md 卡片进度条自动刷新

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 路由逻辑 | `src/lib/intent-router.ts` | 完善 `classifyIntent`，返回 `IntentClassification`（含 `helmSkill` 字段） |
| 工作流进度 | `src/components/layout/WorkflowProgress.tsx` | Topbar 右侧组件；读取 session store 的 `workflowPhase`；阶段推进由 `[[PRISM_PHASE: design]]` 等格式触发 |
| 阶段解析 | `electron/helm/phase-parser.ts` | `parsePhaseMarkers(output: string): HelmPhase \| null` — 检测 `[[PRISM_PHASE: {phase}]]` |
| 主进程 | `electron/main.ts` | `dispatch_intent` handler 重构：创建新 session → `adapter.openSession()` → 注入对应阶段 System Prompt → 启动 `watchOutput` |
| 主进程 | `electron/main.ts` | 收到 `[[PRISM_PHASE: ...]]` 后，更新 session store 并通过 IPC 推送到对应窗口 |
| 渲染进程 | `src/App.tsx` | 监听 `session-phase-changed` 事件，更新 WorkflowProgress |
| 渲染进程 | `src/store/session.ts` | `createSession()`, `updateSessionPhase()`, `closeSession()` actions |

**测试：**
- 单元：`classifyIntent` 给定 10 个输入，验证分类准确率 ≥ 90%
- 单元：`parsePhaseMarkers` 检测 `[[PRISM_PHASE: design]]` 返回 `'design'`
- 集成：模拟 `watchOutput` 回调包含 QUESTION → 渲染进程收到 `show-question-modal` → 弹窗渲染
- E2E：Playwright 录制完整"输入意图 → 弹窗 → 点击 → TASK.md 更新"流程

**工期：** 2 天  
**HITL 决策点：** 首次全流程联通需用户实际操作验证

---

### 切片 F：项目初始化流程（全新项目 + 已有项目迁移）

**目标：** 首次打开项目时，Prism 能自动检测状态并完成初始化或迁移。

**端到端验收：**
1. 打开一个空目录项目
2. Grid 显示 8 张 EMPTY 卡片
3. 点击"[Scan & Initialize Project]"按钮
4. Console Tray 显示步骤日志：`Step 1: Creating docs/...` → `Step 2: Writing templates...` → `Step 3: Installing Git Hooks...`
5. Grid 刷新，卡片从 EMPTY 变为 ACTIVE（模板已填充占位说明）
6. 文件系统验证：`docs/RESEARCH.md`、`docs/CONTEXT.md`、`docs/PRODUCT.md`、`docs/DESIGN.md`、`docs/adr/`、`TASK.md`、`HANDOFF.md` 全部存在
7. `.git/hooks/pre-push` 和 `pre-commit` 存在且可执行
8. 打开一个已有 `README.md` 的项目 → Prism 检测到 → 显示迁移摘要弹窗："已迁移 README.md → CONTEXT.md，发现 5 个 TODO 条目 → TASK.md"

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 初始化逻辑 | `electron/doc-manager/index.ts` | `DocManager.initialize(projectRoot: string): Promise<InitSummary>` — 创建 `docs/` 目录、生成 7 个文档的标准模板（含 header 和占位说明） |
| 初始化模板 | `electron/doc-manager/templates/` | `CONTEXT.md.template`、`PRODUCT.md.template`、`DESIGN.md.template`、`RESEARCH.md.template`、`TASK.md.template`、`HANDOFF.md.template`、`ADR-XXX.md.template` |
| 迁移逻辑 | `electron/doc-manager/migrate.ts` | `DocManager.migrate(projectRoot: string): Promise<MigrateSummary>` — 扫描所有 .md 文件：README.md → 提取名称/技术栈 → CONTEXT.md；TODO/CHANGELOG → TASK.md；design*.md → DESIGN.md；其他列出让用户手动归类 |
| Git Hook | `electron/doc-manager/githooks.ts` | `installGitHooks(projectRoot: string)` — 写入 `pre-push`（阻止 AI push：`echo "AI push blocked by Prism" && exit 1`）和 `pre-commit`（检测危险模式：检查是否包含 `rm -rf`、`DROP TABLE` 等） |
| 弹窗组件 | `src/components/modals/MigrateSummaryModal.tsx` | 迁移完成后显示：列出已迁移内容摘要 |
| 渲染进程 | `src/App.tsx` | 零状态页面按钮调用 `invoke('initialize_project', { projectRoot })` |
| 渲染进程 | `src/App.tsx` | 检测到已有 README.md 但无 CONTEXT.md 时，自动弹出迁移确认对话框 |

**测试：**
- 单元：`initialize()` 在临时目录执行后，验证 7 个文件存在且非空
- 单元：`migrate()` 给定一个含 README.md + TODO.md 的目录，验证 CONTEXT.md 和 TASK.md 内容正确
- 单元：`installGitHooks()` 后 `pre-push` 文件存在且执行返回 exit code 1
- 集成：给定空目录 → `scan_helm_docs` 返回 8 个 EMPTY → 调用 initialize → `scan_helm_docs` 返回 8 个 ACTIVE

**工期：** 2 天  
**HITL 决策点：** 无

---

### 切片 G：Helm 规范违反检测器

**目标：** Prism 解析 IDE 输出时，同步检测 Helm 规范反模式，自动告警并修正。

**端到端验收：**
1. Claude Code 输出："好的，我先把所有表建好，然后再写前端"
2. Console Tray 立即显示红色告警：`[HELM WARN] IDE 输出包含"先建所有表" → 违反垂直切片原则`
3. Console Tray 显示：`[HELM] 已自动向 IDE 注入修正指令`
4. 项目根目录 `.ai/prism-correction.md` 生成，内容为修正指令："请遵守垂直切片原则，每个 Issue 必须是端到端可演示的功能"
5. Claude Code 输出："测试后面再补，先把功能写完"
6. Console Tray 显示黄色告警 + 弹窗提示用户："AI 试图跳过测试，是否允许？"

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 检测器 | `electron/helm/violation-detector.ts` | `detectViolations(output: string, docState: DocState): Violation[]` |
| 检测器 | `electron/helm/violation-detector.ts` | 规则 1：水平分层 — 正则 `/(先建所有表\|先写所有 API\|先把数据库层做完)/i` |
| 检测器 | `electron/helm/violation-detector.ts` | 规则 2：跳过测试 — 正则 `/(测试后面补\|先写代码\|测试跳过)/i` |
| 检测器 | `electron/helm/violation-detector.ts` | 规则 3：推翻冻结需求 — 监听 `docs/CONTEXT.md` 变化，检查是否修改了标记为 `<!-- LOCKED -->` 的段落 |
| 检测器 | `electron/helm/violation-detector.ts` | 规则 4：无反馈环 — 连续 500 字输出但无测试代码（正则检测 `describe\|it\|test(`） |
| 修正注入 | `electron/helm/violation-detector.ts` | `generateCorrection(violation: Violation): string` — 根据违规类型生成对应的 System Prompt 修正片段 |
| 主进程 | `electron/main.ts` | `watchOutput` 回调中，每次收到新输出先调用 `detectViolations`，有 violation 时：Console 日志 + 写入 `.ai/prism-correction.md` + 高优先级弹窗（阻塞性） |
| 渲染进程 | `src/components/layout/ConsoleTray.tsx` | 日志按类型着色：`HELM [WARN]` 黄色，`HELM [BLOCK]` 红色 |
| 弹窗组件 | `src/components/modals/ViolationAlertModal.tsx` | 规则 3（推翻冻结需求）触发时强制弹窗：显示被修改的段落 + "[授权修改] / [撤销并锁定]" |

**测试：**
- 单元：给定 4 种违规文本，验证每种都正确检测并返回对应 `violationType`
- 单元：给定合规文本（含测试代码、垂直切片描述），验证返回空数组
- 单元：`generateCorrection('horizontal-layering')` 返回包含"垂直切片"关键词的字符串
- 集成：模拟 IDE 输出包含违规 → 验证 IPC 消息 `helm-violation-detected` 到达渲染进程

**工期：** 1.5 天  
**HITL 决策点：** 无

---

### 切片 H：TASK.md 状态控制台完善

**目标：** Inspector 打开 `TASK.md` 时，底部显示切片状态徽章组；点击后原子写入更新；Grid 卡片同步刷新进度条。

**端到端验收：**
1. 打开 `TASK.md` 的 Inspector
2. 底部显示切片列表，每行有 4 个状态徽章：`[✓ 完成] [⟳ 进行中] [⏸ 等待] [✕ 阻塞]`
3. 点击"切片 #2"的"完成"徽章 → 徽章高亮 → Console 显示 `DOC: TASK.md 已更新（切片 #2 → 完成）`
4. 外部验证：`TASK.md` 中切片 #2 的状态列从"In Progress"变为"Done"
5. Grid 中 TASK.md 卡片进度条从 25% 跳到 50%
6. 点击"[IDE]"按钮 → 对应 IDE 打开 TASK.md 并定位到切片 #2 所在行

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 解析器 | `electron/doc-manager/task-parser.ts` | `parseTaskSlices(content: string): TaskSlice[]` — 从 Markdown 表格提取切片 ID、描述、状态、类型、备注 |
| 写入器 | `electron/doc-manager/mutator.ts` | 修正：当前实现只支持 `PROGRESS.md`，需改为支持 `TASK.md`（规约标准命名）；表头对齐规约：`| ID \| Description \| Status \| Type \| Notes \|` |
| 渲染进程 | `src/components/inspector/TaskStatusBadges.tsx` | 从 `InspectorPanel.tsx` 抽离；每切片一行，4 个徽章按钮 + [IDE] 按钮 |
| 渲染进程 | `src/components/cards/TaskProgressCard.tsx` | 独立组件；解析 `TASK.md` 内容计算 `completedTasks / totalTasks`，渲染进度条 |
| 渲染进程 | `src/App.tsx` | Grid 中 TASK.md 卡片使用 `<TaskProgressCard>` |
| 主进程 | `electron/main.ts` | `update_task_status` handler 改为写入 `TASK.md`（而非 `PROGRESS.md`） |

**测试：**
- 单元：`parseTaskSlices` 给定标准格式 TASK.md，返回正确数组
- 单元：`updateMarkdownTableStatus` 对 TASK.md 格式正确更新
- 集成：模拟点击"完成" → 验证 `TASK.md` 内容变更 → `chokidar` 触发 → Grid 进度条更新

**工期：** 1 天  
**HITL 决策点：** 无

---

### 切片 I：Cursor 适配器

**目标：** 实现 `CursorAdapter`，支持 Rules 文件注入 + 输出目录监听 + QUESTION 弹窗全流程。

**端到端验收：**
1. Topbar IDE 切换下拉框选择"Cursor"
2. Console 显示：`SYSTEM: 检测到 Cursor（Rules 模式）`
3. 项目根目录生成 `.cursor/rules`（或 `.cursorrules` 兼容旧版），内含 Helm 规范约束
4. 输入意图 → 打开新 Session → `.cursor/rules` 注入对应阶段 System Prompt
5. Cursor 输出包含 `[[PRISM_QUESTION]]` → Prism 正确渲染弹窗
6. 用户点击选项 → Prism 通过 Cursor CLI 或直接写入输入队列文件发送答案
7. Console 显示：`SYSTEM: Cursor 适配器已建立双向通信`

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 适配器 | `electron/adapters/cursor.ts` | `CursorAdapter implements IDEAdapter` |
| 适配器 | `electron/adapters/cursor.ts` | `detect()`: 检查 `.cursor/` 目录是否存在（表明项目被 Cursor 打开过）或 `cursor` 命令在 PATH |
| 适配器 | `electron/adapters/cursor.ts` | `injectSystemPrompt()`: 写入 `.cursor/rules`（新版）和 `.cursorrules`（旧版兼容），内容为 Helm 规范模板 |
| 适配器 | `electron/adapters/cursor.ts` | `openSession()`: 通过 `cursor --chat "{message}"` 或写入 `.cursor/chat/` 的队列文件打开新 chat；返回 chat UUID |
| 适配器 | `electron/adapters/cursor.ts` | `sendMessage()`: 优先尝试 `cursor --chat "{message}"`，失败则写入 `.cursor/chat/{sessionId}/input.md` |
| 适配器 | `electron/adapters/cursor.ts` | `watchOutput()`: `chokidar` 监听 `.cursor/chat/{sessionId}/` 目录变化，读取最新 assistant 消息，调用 `parseQuestionBlocks` |
| 适配器 | `electron/adapters/cursor.ts` | `getProjectRoot()`: 读取 `.cursor/project.json` 中的 `projectPath` |
| 适配器 | `electron/adapters/AdapterManager.ts` | 注册 `CursorAdapter` |
| 渲染进程 | `src/components/layout/Topbar.tsx` | IDE 切换框显示 Cursor 选项 |

**测试：**
- 单元：`detect()` mock 文件系统，`.cursor/` 存在时返回 true
- 单元：`injectSystemPrompt()` 后 `.cursor/rules` 存在且内容正确
- 集成：mock `cursor/chat/` 目录，写入模拟 IDE 输出 → 验证 `watchOutput` callback 触发

**工期：** 1.5 天  
**HITL 决策点：** D-007 — Cursor 发送消息机制需要实测验证（CLI 接口 vs 写入队列文件）

---

### 切片 J：Windsurf 适配器

**目标：** 实现 `WindsurfAdapter`，与 Cursor 适配器结构一致。

**端到端验收：**
1. IDE 切换选择"Windsurf"
2. Console 显示：`SYSTEM: 检测到 Windsurf（Rules 模式）`
3. 项目根目录生成 `.windsurfrules`
4. 全流程与切片 I 一致

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 适配器 | `electron/adapters/windsurf.ts` | `WindsurfAdapter implements IDEAdapter` |
| 适配器 | `electron/adapters/windsurf.ts` | `detect()`: 检查 `windsurf` 命令在 PATH |
| 适配器 | `electron/adapters/windsurf.ts` | `injectSystemPrompt()`: 写入 `.windsurfrules` |
| 适配器 | `electron/adapters/windsurf.ts` | `watchOutput()`: `chokidar` 监听 `~/.windsurf/conversations/` 目录，解析 JSON 格式对话记录 |
| 适配器 | `electron/adapters/windsurf.ts` | `sendMessage()`: 写入 Windsurf 对话队列文件（路径待实测确认） |

**测试：**
- 单元：与 Cursor 适配器相同模式

**工期：** 1 天  
**HITL 决策点：** D-001 — Windsurf 对话历史文件具体路径需要实测确认

---

### 切片 K：上下文快满检测 + 强制 grill 弹窗

**目标：** 当 IDE session 上下文窗口接近满载时，强制用户保存关键决策到物理文档。

**端到端验收：**
1. Claude Code 输出包含 `[[CONTEXT_WARNING]]`
2. Prism 立即显示特殊弹窗："⚡ 上下文窗口即将满载"
3. 弹窗列出待确认决策："使用 Supabase 而非自建 Postgres（来自 15 分钟前的讨论）"
4. 用户点击"写入 ADR 并保存"
5. `docs/adr/ADR-001-supabase-vs-postgres.md` 自动生成，包含决策内容和上下文
6. Console 显示：`DOC: ADR-001 已保存`
7. IDE 收到确认后，输出 `[[PRISM_PHASE: grill]]` 进入收敛阶段

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 检测器 | `electron/helm/context-monitor.ts` | `checkContextWarning(output: string): ContextWarning \| null` — 检测 `[[CONTEXT_WARNING]]` 标签 |
| 决策提取 | `electron/helm/context-monitor.ts` | `extractPendingDecisions(sessionId: string): Decision[]` — 从 session 历史中提取未写入 ADR 的关键决策（基于最近 20 轮对话摘要） |
| ADR 生成 | `electron/doc-manager/adr-writer.ts` | `writeADR(projectRoot: string, decision: Decision): Promise<string>` — 生成 `docs/adr/ADR-{NNN}-{slug}.md`，包含标准 ADR 格式（Context / Decision / Consequences） |
| 弹窗组件 | `src/components/modals/ContextWarningModal.tsx` | 显示上下文使用率、待确认决策列表、两个按钮"写入 ADR 并保存" / "跳过（风险：决策可能丢失）" |
| 渲染进程 | `src/App.tsx` | 监听 `context-warning` IPC 事件，强制弹出 `ContextWarningModal`（阻塞式，不关闭不能继续） |
| 主进程 | `electron/main.ts` | `watchOutput` 回调中检测 `[[CONTEXT_WARNING]]` → 暂停轮询 → 发送 IPC → 等待用户决策 → 恢复轮询 |

**测试：**
- 单元：`checkContextWarning` 检测到标签返回警告对象；无标签返回 null
- 单元：`writeADR` 后文件存在且包含 `## Context`、`## Decision`、`## Consequences`
- 集成：模拟输出含 `[[CONTEXT_WARNING]]` → 验证弹窗 IPC 到达渲染进程

**工期：** 1.5 天  
**HITL 决策点：** 无

---

### 切片 L：Antigravity 适配器完善

**目标：** 将现有 `AntigravityAdapter` 从实验性实现完善为符合 `IDEAdapter` 完整接口的生产级适配器。

**端到端验收：**
1. IDE 切换选择"Antigravity"
2. 全流程与切片 I / J 一致
3. 规约要求的 `injectSystemPrompt` 实际写入 `.antigravity/rules.md`

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| 适配器 | `electron/adapters/antigravity.ts` | 补齐 `detect()`, `injectSystemPrompt()`, `openSession()`, `sendMessage()`, `getProjectRoot()` |
| 适配器 | `electron/adapters/antigravity.ts` | `injectSystemPrompt()`: 写入 `.antigravity/rules.md`（路径待确认） |
| 适配器 | `electron/adapters/antigravity.ts` | `watchOutput()`: 监听 Antigravity 对话历史目录（待确认具体路径） |
| 适配器 | `electron/adapters/antigravity.ts` | 移除 `require('fs')` 混用，统一使用 `fs/promises` |

**工期：** 1 天  
**HITL 决策点：** D-002 — Antigravity 的 Rules 文件路径和对话历史目录需要查阅官方文档

---

### 切片 M：E2E 测试套件 + 集成验收

**目标：** 用 Playwright for Electron 覆盖所有核心用户流程，确保整个系统端到端稳定。

**端到端验收：**
1. 运行 `npm run test:e2e`
2. 所有测试通过，包括：
   - 完整意图 → 弹窗 → 文档更新流程
   - Inspector 打开/关闭/ESC 行为
   - Grid 实时刷新（外部修改文件后 1 秒内更新）
   - 多窗口隔离（窗口 A 和窗口 B 互不干扰）
   - 项目初始化流程（空目录 → 8 张卡片全部 ACTIVE）
   - 项目迁移流程（README.md 存在 → 迁移弹窗出现）
   - 违反检测（AI 输出违规 → Console 告警）

**包含内容（垂直贯穿）：**

| 层级 | 文件 | 实现要点 |
|---|---|---|
| E2E 框架 | `tests/e2e/setup.ts` | Playwright Electron 启动配置 |
| E2E 测试 | `tests/e2e/intent-flow.spec.ts` | 输入意图 → 分类 → 静默提示 → 新窗口 |
| E2E 测试 | `tests/e2e/question-modal.spec.ts` | mock IDE 输出 QUESTION → 弹窗渲染 → 点击选项 → 答案发回 |
| E2E 测试 | `tests/e2e/inspector.spec.ts` | 点击卡片 → Inspector 滑出 → Markdown 渲染 → ESC 关闭 |
| E2E 测试 | `tests/e2e/grid-refresh.spec.ts` | 外部修改文件 → 1 秒内 Grid 刷新 |
| E2E 测试 | `tests/e2e/multi-window.spec.ts` | 打开两个窗口 → 选择不同项目 → 状态隔离 |
| E2E 测试 | `tests/e2e/project-init.spec.ts` | 空目录 → 初始化 → 8 张卡片 ACTIVE |
| E2E 测试 | `tests/e2e/violation.spec.ts` | mock 违规输出 → Console 出现 WARN 日志 |
| 集成测试 | `tests/integration/ipc.spec.ts` | 主进程 ↔ 渲染进程 完整链路 |
| 集成测试 | `tests/integration/adapter.spec.ts` | 各 IDEAdapter `detect()` 和 `injectSystemPrompt()`（mock 文件系统） |

**测试：**
- E2E：全部 8 个 spec 文件通过
- 性能：Grid 刷新延迟 < 1000ms（chokidar + IPC + React 重渲染）

**工期：** 2 天  
**HITL 决策点：** 无

---

## 4. 工期总览

| 切片 | 内容 | 预估工期 | 依赖 |
|---|---|---|---|
| A | 文档对齐 + Zustand 重构 | 1 天 | 无 |
| B | System Prompt 模板引擎 | 1.5 天 | A |
| C | QUESTION 解析 + 弹窗队列 | 1.5 天 | A |
| D | Claude Code 完整适配器 | 3 天 | B, C |
| E | 意图 → Claude Code 全流程 | 2 天 | D |
| F | 项目初始化 + 迁移 | 2 天 | A |
| G | Helm 规范违反检测 | 1.5 天 | C |
| H | TASK.md 状态控制台 | 1 天 | A |
| I | Cursor 适配器 | 1.5 天 | B, C |
| J | Windsurf 适配器 | 1 天 | I |
| K | 上下文快满 + ADR | 1.5 天 | C, F |
| L | Antigravity 适配器 | 1 天 | I, J |
| M | E2E 测试套件 | 2 天 | E, F, G, H, I, J, K |
| **总计** | | **~20 工作日** | |

**关键路径：** A → B → D → E → M（约 10 工作日）

---

## 5. 风险与应对

| 风险 | 影响切片 | 应对策略 |
|---|---|---|
| Claude Code MCP 官方 API 变动 | D, E | 保留 `.ai/prism-intent.md` 文件回退方案 |
| Cursor / Windsurf 输出目录结构变更 | I, J | 适配器内部做版本兼容（检测多个可能路径） |
| Electron + React 19 兼容性问题 | A, M | 每个切片完成后立即运行 E2E 冒烟测试 |
| 用户项目根目录已有 `.cursorrules` | B, I | `injectSystemPrompt` 默认 `append` 模式，不覆盖用户内容 |
| 多窗口 Session 同步竞态 | A, E | 主进程持有唯一 Session 状态源，渲染进程只读 |

---

## 6. 验收标准（整体项目）

以下所有条件必须同时满足，才能标记 Prism 达到 `0.2.0-beta`：

1. [ ] 用户输入任意意图 → Prism 正确分类 → 打开对应 IDE session → 注入 System Prompt
2. [ ] Claude Code / Cursor / Windsurf 至少有一个适配器能完成双向通信（发送消息 + 监听输出 + 弹窗交互）
3. [ ] 所有 AI 追问必须经过弹窗层，禁止自然语言提问漏过
4. [ ] 外部修改 `docs/` 下任何 Helm 文档 → 1 秒内 Grid 对应卡片刷新
5. [ ] 打开空项目 → 一键初始化 → 7 个文档 + Git Hook 全部就绪
6. [ ] IDE 输出包含违规关键词 → Console Tray 3 秒内显示告警
7. [ ] `npm run test` 全部通过（单元 + 集成）
8. [ ] `npm run test:e2e` 全部通过
9. [ ] 多窗口模式下，窗口 A 和窗口 B 的项目状态完全隔离
10. [ ] 零 emoji、零渐变色、动画 < 200ms（符合 7.5 节视觉规约）

---

*本文档版本：0.2.0-alpha*  
*下一步：执行切片 A，完成后更新本文档进度*
