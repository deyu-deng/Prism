# PRISM — 项目开发书
**版本：** 0.1.0-alpha  
**面向读者：** AI 编程工具（Claude Code / Cursor / Windsurf / Antigravity）  
**定位：** Helm 工作流的图形化操作台，面向不会写代码的独立开发者  
**约束：** 本文档是唯一的权威规约，所有实现必须以本文档为准，禁止 AI 自行扩展未定义的功能

---

## 目录

1. [产品定位与核心原则](#1-产品定位与核心原则)
2. [技术栈决策](#2-技术栈决策)
3. [架构总览](#3-架构总览)
4. [IDE 连接层规约](#4-ide-连接层规约)
5. [文档资产管理规约](#5-文档资产管理规约)
6. [核心模块规约](#6-核心模块规约)
7. [UI/UX 视觉规约](#7-uiux-视觉规约)
8. [开发切片计划](#8-开发切片计划)
9. [测试规约](#9-测试规约)
10. [文件结构](#10-文件结构)
11. [未解决决策（待 grill）](#11-未解决决策待-grill)

---

## 1. 产品定位与核心原则

### 1.1 产品一句话定位

Prism 是 Helm 工作流的图形化操作台。它不是一个聊天界面，而是一个**工作流强制执行引擎**——通过向 IDE 注入 System Prompt 并监听 IDE 输出，把 Helm 工作流里的所有规范（追问、TDD、垂直切片、文档写入）从"依赖 AI 自律"变成"界面强制执行"。

### 1.2 目标用户画像

- 独立开发者，不会写代码，但愿意理解技术名称
- 使用 Claude Code、Cursor、Windsurf、Antigravity 之一
- 想用 AI 开发中大型项目，但苦于 AI 容易跑偏、上下文丢失、代码质量不可控
- **操作偏好：做选择题，而不是填空题**

### 1.3 核心设计原则

```
原则 1：用户永远只做选择题
         Prism 把所有 AI 追问转化为点击选项，最后一项永远是"输入其他想法"

原则 2：物理文档是唯一真相
         所有决策、进度、设计规范必须写入物理文件，不存在只在 AI 记忆里的状态

原则 3：IDE 连接是透明的
         用户选择 IDE 后，Prism 自动切换最优连接方案，用户不感知连接细节

原则 4：工作流是强制的，不是建议的
         Prism 通过 System Prompt 注入强制 IDE 遵守 Helm 规范，禁止 AI 自行跳过步骤

原则 5：Session = 窗口
         每个 Prism 工作窗口和 IDE 里的一个 chat session 一一对应，互相感知状态
```

### 1.4 与 Gemini spec.md 的关系

Gemini 的 spec.md 提供了有价值的模块概念，本文档在以下方面做了修正：

| Gemini spec 的描述 | 本文档的修正 | 原因 |
|---|---|---|
| Tauri + Rust 技术栈 | 改为 Electron + TypeScript（见第 2 节） | 迭代速度和生态优先 |
| `PROJECT.md` 和 `PROGRESS.md` | 改为 Helm 标准文档命名体系 | 与工作流文档保持一致 |
| 3 张卡片的决策面板 | 保留，扩展为多种弹窗类型 | 原设计良好，需要覆盖更多场景 |
| 静默后台推演 | 保留，但推演逻辑改为 System Prompt 触发，不由 Prism 自己调 LLM | 保持 IDE LLM 的主导地位 |
| Console Tray 日志 | 保留，扩展为操作日志 + Helm 规范违反告警 | 透明度原则 |

---

## 2. 技术栈决策

### 2.1 主框架：Electron + React + TypeScript

**选型理由：**
- Electron 允许访问文件系统、监听文件变化、读写 IDE 配置文件——这三个能力是 Prism 的核心需求
- React + TypeScript 生态成熟，组件库丰富，迭代速度快
- 与 Tauri/Rust 相比，TypeScript 全栈降低了维护复杂度，不需要同时维护两种语言的逻辑
- Electron 的 `BrowserWindow` 支持多窗口，与"每个工作窗口对应一个 IDE session"的设计天然契合

**性能策略：**
- 文件监听使用 `chokidar`（不是 `fs.watch`，避免跨平台问题）
- 主进程和渲染进程通过 `ipcMain` / `ipcRenderer` 通信，文件 IO 全部在主进程执行
- LLM 输出监听使用轮询 + diff 策略，不建立长连接（避免各 IDE 连接方式不统一带来的复杂度）

### 2.2 UI 层：React + Tailwind CSS + shadcn/ui

- shadcn/ui 提供工业级组件基础（Dialog、Badge、Sidebar 等）
- Tailwind 控制间距和配色，严格遵守第 7 节视觉规约
- 动效库：`framer-motion`，用于侧边栏滑出、弹窗出现等过渡动画

### 2.3 状态管理：Zustand

- 轻量，不需要 Redux 的复杂度
- 多窗口状态通过主进程 `ipcMain` 广播同步，Zustand 只负责单窗口内的状态

### 2.4 文件 IO：Node.js `fs` + `chokidar`

- 所有文件读写在 Electron 主进程执行
- `chokidar` 监听 Helm 文档目录，文件变化时通过 IPC 推送到渲染进程
- 写入策略：读入内存 → 修改 → 写入临时文件 → `fs.rename` 覆盖（原子写入，防损坏）

### 2.5 依赖总览

```json
{
  "electron": "latest",
  "react": "^18",
  "typescript": "^5",
  "tailwindcss": "^3",
  "shadcn/ui": "latest",
  "framer-motion": "^11",
  "zustand": "^4",
  "chokidar": "^3",
  "react-markdown": "^9",
  "remark-gfm": "^4",
  "zod": "^3"
}
```

---

## 3. 架构总览

### 3.1 系统层级

```
┌─────────────────────────────────────────────────────┐
│                    用户                              │
│         （点选项、看状态、切 IDE、描述意图）           │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Prism GUI                           │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ 意图输入栏   │ │ 工作流弹窗层  │ │ 状态网格视口  │  │
│  │ (Topbar)    │ │ (Modal Layer)│ │ (Grid View)  │  │
│  └─────────────┘ └──────────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │           Inspector 侧边栏                    │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │          Console Tray（底部日志）              │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────┘
                        │  IPC
┌───────────────────────▼─────────────────────────────┐
│              Electron 主进程                          │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │
│  │ 文件监听器    │ │ IDE 连接适配器│ │ 文档资产管理 │  │
│  │ (chokidar)  │ │ (IDE Adapter)│ │  (DocManager)│  │
│  └──────────────┘ └──────────────┘ └─────────────┘  │
└───────────┬─────────────────┬───────────────────────┘
            │                 │
    ┌───────▼──────┐  ┌───────▼──────────────────────┐
    │ Helm 文档目录 │  │       IDE 本地进程             │
    │ PROJECT.md   │  │  Claude Code / Cursor /       │
    │ CONTEXT.md   │  │  Windsurf / Antigravity        │
    │ TASK.md      │  │                               │
    │ DESIGN.md    │  │  ← System Prompt 注入          │
    │ RESEARCH.md  │  │  ← 输出文件监听                │
    │ HANDOFF.md   │  │  ← MCP 工具调用（Claude Code） │
    │ adr/         │  └───────────────────────────────┘
    └──────────────┘
```

### 3.2 数据流：从用户意图到 IDE 执行

```
用户输入意图
     │
     ▼
Prism 解析意图类型
（新功能 / Bug 修复 / 需求探索 / 架构扫描）
     │
     ▼
生成对应的 System Prompt 片段
（包含 Helm 规范约束 + 意图内容 + 当前文档上下文摘要）
     │
     ▼
IDE 连接适配器 → 写入 IDE 的 System Prompt / Rules 文件
     │
     ▼
IDE LLM 激活，开始追问用户
     │
     ▼
Prism 轮询 IDE 输出目录，检测到 [[QUESTION:...]] 格式
     │
     ▼
渲染为 Prism 弹窗，用户点击选项
     │
     ▼
Prism 把用户选择写回 IDE 的输入队列 / 对话文件
     │
     ▼
IDE LLM 继续执行（编码 / 写文档 / 生成切片……）
     │
     ▼
chokidar 检测到 Helm 文档变化 → Prism 刷新网格视口
```

---

## 4. IDE 连接层规约

### 4.1 总体设计

IDE 连接层是 Prism 的最核心技术模块，采用**适配器模式**：每个 IDE 有一个独立的 `IDEAdapter` 实现，对外暴露统一接口。

```typescript
interface IDEAdapter {
  // 检测 IDE 是否在运行
  detect(): Promise<boolean>;
  
  // 注入 System Prompt（全量覆盖或追加）
  injectSystemPrompt(prompt: string, mode: 'override' | 'append'): Promise<void>;
  
  // 打开一个新的 chat session，返回 session ID
  openSession(config: SessionConfig): Promise<string>;
  
  // 向指定 session 发送用户消息
  sendMessage(sessionId: string, message: string): Promise<void>;
  
  // 监听指定 session 的输出，回调收到新内容
  watchOutput(sessionId: string, callback: (chunk: string) => void): () => void;
  
  // 读取当前活跃项目的根目录路径
  getProjectRoot(): Promise<string>;
}
```

### 4.2 各 IDE 连接方案

#### Claude Code

**连接方案：MCP Server（官方支持，最优先）**

Claude Code 原生支持 MCP，Prism 启动时作为本地 MCP Server 运行。

```
实现要点：
- Prism 在本地启动一个 MCP Server（端口动态分配，写入 ~/.claude/claude_desktop_config.json）
- 提供以下 MCP 工具：
  - prism_read_context: 读取当前项目的 Helm 文档摘要
  - prism_write_decision: 把用户决策写入物理文档
  - prism_ask_user: 触发 Prism 弹窗（Helm 规范中的 HITL 决策点）
  - prism_update_task: 更新 TASK.md 中的切片状态
- System Prompt 通过 CLAUDE.md（项目根目录）注入 Helm 规范约束
- Session 对应：Claude Code 的每个 chat 对应 Prism 的一个工作窗口
```

#### Cursor

**连接方案：Rules 文件注入 + 输出目录监听**

```
实现要点：
- System Prompt 写入 .cursor/rules（或 .cursorrules，做版本兼容）
- Prism 监听 .cursor/chat/ 目录（Cursor 把 chat 历史写在这里）
  - 使用 chokidar 监听目录变化
  - 检测到新文件或文件更新时，读取最新内容，执行 QUESTION 格式解析
- 发送消息：通过 Cursor 的 CLI 接口（cursor --chat "message"）或直接写入输入队列文件
- Session 对应：每个 Cursor chat window 的 UUID 对应 Prism 的一个工作窗口
```

#### Windsurf

**连接方案：Rules 文件注入 + 输出目录监听**

```
实现要点：
- System Prompt 写入 .windsurfrules（项目根目录）
- Windsurf 把 cascade 对话历史写在 ~/.windsurf/conversations/ 目录
  - chokidar 监听此目录
  - 解析 JSON 格式的对话记录，提取最新 assistant 消息
- 发送消息：写入 Windsurf 的对话队列文件（待逆向确认具体路径，见 11 节未解决决策）
- Session 对应：每个 Windsurf cascade session 对应 Prism 的一个工作窗口
```

#### Antigravity（Google Gemini IDE）

**连接方案：Rules 文件注入 + 输出目录监听**

```
实现要点：
- System Prompt 写入 .antigravity/rules.md（或对应配置文件，待确认）
- 监听 Antigravity 的对话历史目录（待确认具体路径，见 11 节）
- Session 对应方式同 Cursor
注意：Antigravity 是较新产品，此适配器优先级排在最后，在前三个适配器稳定后再实现
```

### 4.3 QUESTION 格式协议（关键）

这是 Prism 和 IDE LLM 之间的通信协议核心。所有需要用户做决策的场景，IDE LLM 必须输出以下格式，Prism 检测到后渲染为弹窗：

```
[[PRISM_QUESTION]]
type: choice | confirm | input | multi_select
phase: explore | grill | design | slice | hitl | review
title: 你想要哪种认证方案？
options:
  - label: A. 极简本地方案
    detail: 只需邮箱+密码，无第三方依赖，适合 MVP 阶段
  - label: B. Google OAuth
    detail: 用户一键登录，需要配置 Google Cloud Console
  - label: C. 其他想法
    input: true
[[/PRISM_QUESTION]]
```

**弹窗类型对应：**

| type | 渲染形式 | 适用场景 |
|---|---|---|
| `choice` | 3 张水平卡片 | 技术选型、方案选择 |
| `confirm` | 两个按钮（确认/调整） | 需求确认、切片审查 |
| `input` | 文本输入框 + 提交 | 用户需要自由表达 |
| `multi_select` | 多选卡片组 | 功能列表选择（explore 阶段） |

**注入的 System Prompt 必须包含以下约束：**

```
当你需要向用户提问时，必须使用 [[PRISM_QUESTION]] 格式输出，禁止用自然语言提问。
每次只输出一个 [[PRISM_QUESTION]] 块，等待用户回复后再继续。
```

### 4.4 Session 与窗口对应

```typescript
interface PrismSession {
  id: string;                    // Prism 内部 UUID
  ideSessionId: string;          // IDE 侧的 session/chat ID
  workflowPhase: HelmPhase;      // 当前所在的 Helm 工作流阶段
  taskType: TaskType;            // 新功能 | Bug修复 | 需求探索 | 架构扫描
  projectRoot: string;           // 对应项目根目录
  windowId: number;              // Electron BrowserWindow ID
  createdAt: Date;
  lastActiveAt: Date;
}

type HelmPhase = 
  | 'init'        // Phase 0 初始化
  | 'explore'     // Phase 1 探索
  | 'recon'       // Phase 1 调研
  | 'grill'       // Phase 1/2 收敛
  | 'design'      // Phase 2 设计
  | 'slice'       // Phase 2 切片
  | 'code'        // Phase 3 编码
  | 'test'        // Phase 4 测试
  | 'debug'       // Phase 5 调试
  | 'deploy';     // Phase 7 部署

type TaskType = 
  | 'feature'     // 新功能开发（Phase 1 → Phase 7）
  | 'bugfix'      // Bug 修复（直接进入 Phase 5）
  | 'explore'     // 纯需求探索（Phase 1 子集）
  | 'refactor';   // 架构扫描重构（Phase 8）
```

---

## 5. 文档资产管理规约

### 5.1 Helm 标准文档体系

Prism 管理的物理文档如下，命名与路径必须严格遵守：

```
{projectRoot}/
├── docs/
│   ├── RESEARCH.md      # 技术/市场调研结果（/plobi-recon 产出）
│   ├── CONTEXT.md       # 对齐后的核心定义、术语表（/plobi-grill 产出）
│   ├── PRODUCT.md       # PRD：功能列表、验收标准（/plobi-synthesize 产出）
│   ├── DESIGN.md        # UI/UX 视觉规范（/plobi-design 产出）
│   └── adr/
│       └── ADR-XXX.md   # 架构决策记录（每个重大决策一个文件）
├── TASK.md              # 实时任务进度（AI 自动更新）
└── HANDOFF.md           # 跨 Session 交接文档（/plobi-package 产出）
```

### 5.2 项目初始化检测（启动时执行）

Prism 打开项目后，执行以下检测流程：

```
Step 1：检测 docs/ 目录是否存在
         ├── 存在：进入 Step 2（整合迁移）
         └── 不存在：进入 Step 3（全新初始化）

Step 2：整合迁移
         扫描项目内所有 .md 文件，识别：
         ├── 已有 README.md：提取项目名称、技术栈描述 → 迁移到 CONTEXT.md
         ├── 已有任何形式的 TODO / CHANGELOG：提取任务条目 → 迁移到 TASK.md
         ├── 已有设计文档（design*.md）：整合到 DESIGN.md
         └── 其他 .md 文件：在 Console Tray 列出，提示用户手动归类
         迁移完成后，Prism 显示"迁移完成"对话框，列出已迁移的内容摘要

Step 3：全新初始化（对应 /plobi-scaffold）
         创建 docs/ 目录结构
         生成所有文档的空模板（包含标准 header 和占位说明）
         触发 IDE 适配器执行 /plobi-guard：
         ├── 写入 .git/hooks/pre-push（阻止 AI push）
         ├── 写入 .git/hooks/pre-commit（检测危险模式）
         └── 在 Console Tray 确认 Hook 安装成功

Step 4（共同）：代码库扫描（对应 /plobi-map）
         如果是接手旧项目（docs/ 不存在 或 CONTEXT.md 为空）：
         向 IDE 发送 /plobi-map 指令
         IDE LLM 扫描代码库，输出模块地图
         Prism 把模块地图写入 CONTEXT.md 的 Architecture 节
```

### 5.3 文档变化监听

```typescript
// 主进程监听所有 Helm 文档
const watchHelmDocs = (projectRoot: string) => {
  const watcher = chokidar.watch([
    path.join(projectRoot, 'TASK.md'),
    path.join(projectRoot, 'HANDOFF.md'),
    path.join(projectRoot, 'docs/**/*.md'),
  ], {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300 }  // 等写完再触发
  });

  watcher.on('change', (filePath) => {
    // 解析变化类型并通过 IPC 推送到渲染进程
    mainWindow.webContents.send('helm-doc-changed', {
      file: path.relative(projectRoot, filePath),
      content: fs.readFileSync(filePath, 'utf-8'),
    });
  });
};
```

---

## 6. 核心模块规约

### 6.1 模块一：意图输入与工作流路由

**位置：** Topbar 中央

**功能：** 接收用户的自然语言意图，分类后路由到对应的工作流分支，并打开对应的 IDE session。

#### 意图分类规则

Prism 在本地（不调用 LLM）基于关键词做意图分类：

```typescript
type IntentClassification = {
  taskType: TaskType;
  suggestedPhase: HelmPhase;
  helmSkill: string;  // 对应触发的 Helm skill
};

const classifyIntent = (input: string): IntentClassification => {
  // 关键词匹配（优先级从高到低）
  if (matches(input, ['bug', '报错', '崩溃', '不工作', 'error', 'fix'])) {
    return { taskType: 'bugfix', suggestedPhase: 'debug', helmSkill: '/plobi-dissect' };
  }
  if (matches(input, ['重构', '架构', '代码乱', '优化结构'])) {
    return { taskType: 'refactor', suggestedPhase: 'code', helmSkill: '/plobi-fuse' };
  }
  if (matches(input, ['想法', '探索', '不确定', '可以做什么', '有什么功能'])) {
    return { taskType: 'explore', suggestedPhase: 'explore', helmSkill: '/plobi-explore' };
  }
  // 默认：新功能
  return { taskType: 'feature', suggestedPhase: 'explore', helmSkill: '/plobi-explore' };
};
```

#### 路由后的行为

| 意图类型 | Prism 行为 | IDE 行为 |
|---|---|---|
| 新功能 | 新建工作窗口，标题"新功能：[意图]" | 打开新 session，注入 explore+grill 规范 |
| Bug 修复 | 新建工作窗口，标题"Bug：[意图]" | 打开新 session，注入 dissect 规范 |
| 需求探索 | 新建工作窗口，标题"探索：[意图]" | 打开新 session，注入 explore 规范 |
| 架构扫描 | 在当前窗口，标题"架构扫描" | 当前 session 注入 fuse 规范 |

#### 静默推演提示

意图提交后，在弹窗层居中显示（不阻断操作）：

```
SYSTEM: Analyzing intent → routing to /plobi-explore
SYSTEM: Loading CONTEXT.md and TASK.md as context...
SYSTEM: Injecting Helm constraints to [IDE Name]...
```

### 6.2 模块二：工作流弹窗层（Modal Layer）

**这是 Prism 最核心的用户交互层。** 所有 AI 追问必须经过此层转化为选择题。

#### 弹窗触发机制

```typescript
// 主进程持续轮询 IDE 输出
const pollIDEOutput = async (sessionId: string) => {
  const rawOutput = await adapter.getLatestOutput(sessionId);
  const questions = parseQuestionBlocks(rawOutput);
  
  for (const question of questions) {
    mainWindow.webContents.send('show-question-modal', question);
    // 等待用户回复后再轮询下一个
    const answer = await waitForUserAnswer(question.id);
    await adapter.sendMessage(sessionId, formatAnswer(answer));
  }
};
```

#### 弹窗类型与渲染规范

**类型 A：三卡片选择（choice）**

适用场景：技术选型、方案选择

```
┌─────────────────────────────────────────────────────────┐
│  你想要哪种认证方案？                                      │
│  （由 /plobi-grill 触发 · Phase: grill）                  │
├─────────────┬──────────────────┬──────────────────────  │
│  A          │  B               │  C                     │
│  极简本地    │  Google OAuth    │  其他想法              │
│  邮箱+密码   │  一键登录         │  [输入框]              │
│  无三方依赖  │  需要配置GCP     │                        │
│  适合 MVP   │  适合正式上线     │                        │
└─────────────┴──────────────────┴──────────────────────  │
```

**类型 B：多选卡片（multi_select）**

适用场景：explore 阶段功能列表选择

```
┌─────────────────────────────────────────────────────────┐
│  以下是我推荐的功能候选，选择你想要加入的：                  │
│  （由 /plobi-explore 触发 · 可多选）                      │
│                                                         │
│  ☐ 版本对比功能    ☐ 评论回复线程    ☐ 文件附件支持        │
│  ☐ 批量操作       ☐ 导出 PDF        ☑ 邮件通知（已选）     │
│                                                         │
│  [还有其他想法]                    [确认所选，继续]        │
└─────────────────────────────────────────────────────────┘
```

**类型 C：确认弹窗（confirm）**

适用场景：切片审查、需求冻结确认

```
┌─────────────────────────────────────────────────────────┐
│  以下切片划分是否符合你的预期？                              │
│  （由 /plobi-slice 触发 · Phase: slice）                  │
│                                                         │
│  切片 #1：用户可以创建 Todo（AFK）                         │
│  切片 #2：用户可以删除 Todo（AFK）                         │
│  切片 #3：多用户权限（HITL — 需要你决策 RLS 策略）          │
│                                                         │
│  [有需要调整]              [确认，开始编码]                 │
└─────────────────────────────────────────────────────────┘
```

#### 上下文快满时的特殊弹窗

当 Prism 检测到 IDE session 的输出速度下降或输出内容包含 `[[CONTEXT_WARNING]]` 时，强制触发：

```
┌─────────────────────────────────────────────────────────┐
│  ⚡ 上下文窗口即将满载                                     │
│                                                         │
│  在继续之前，/plobi-grill 需要确认以下决策是否需要写入      │
│  物理文档，防止上下文重置后丢失：                           │
│                                                         │
│  待确认决策：                                             │
│  · 使用 Supabase 而非自建 Postgres（来自 15 分钟前的讨论） │
│  · 软删除方案（来自 8 分钟前的讨论）                       │
│                                                         │
│  [写入 ADR 并保存]          [跳过（风险：决策可能丢失）]    │
└─────────────────────────────────────────────────────────┘
```

### 6.3 模块三：状态网格视口（Grid Viewport）

**功能：** 把 Helm 文档目录渲染为可视化状态卡片，实时反映项目状态。

#### 状态卡片规范

每个 Helm 文档对应一张卡片：

```typescript
interface DocCard {
  filename: string;         // TASK.md / CONTEXT.md 等
  displayName: string;      // 显示名："任务进度" / "需求定义" 等
  status: DocStatus;        // 见下方
  lastModified: Date;
  summaryLine: string;      // 文件第一个非空标题或前 60 字符
  warningCount: number;     // Helm 规范违反数量（比如 TASK.md 里有 5 个超期任务）
}

type DocStatus = 
  | 'ACTIVE'    // 最近 10 分钟有修改
  | 'LOCKED'    // 已冻结（grill 确认后）
  | 'PENDING'   // 有待处理的 HITL 决策
  | 'EMPTY'     // 文件存在但内容为空（模板未填充）
  | 'STALE';    // 超过 7 天没有修改（可能需要更新）
```

#### 网格布局规则

- 默认 3 列自适应网格
- 卡片点击 → Inspector 侧边栏滑出，显示该文档详情
- TASK.md 卡片有特殊处理：显示进度条（完成切片数 / 总切片数）

### 6.4 模块四：Inspector 侧边栏

**功能：** 右侧滑出，展示选中文档的渲染内容，并提供直接操作能力。

#### 基本规范

- 宽度：420px，不可调整（保证左侧主工作台稳定）
- 打开：点击网格卡片
- 关闭：再次点击同一卡片 / 按 ESC / 点击左侧任意区域
- 过渡动画：`framer-motion` `x: 420 → 0`，150ms，`ease-out`

#### TASK.md 的特殊渲染

当 Inspector 打开 TASK.md 时，底部追加状态控制徽章组：

```
[切片 #3 · 多用户权限]

  [✓ 完成]  [⟳ 进行中]  [⏸ 等待]  [✕ 阻塞]

状态更新将原子写入 TASK.md
```

点击徽章触发原子写入：
```
读取 TASK.md 到内存
→ 正则匹配切片 ID 所在行
→ 替换状态文本
→ 写入临时文件 TASK.md.tmp
→ fs.rename('TASK.md.tmp', 'TASK.md')
→ chokidar 触发 → Grid 刷新
```

### 6.5 模块五：工作流进度指示器

**位置：** 每个工作窗口的 Topbar 右侧

**功能：** 显示当前 session 所在的 Helm 工作流阶段

```
[Phase 1: 需求探索] → [Phase 2: 方案设计] → [Phase 3: 编码] → ...
   ● 当前                ○ 未开始             ○ 未开始
```

阶段推进规则：
- 由 IDE LLM 输出 `[[PRISM_PHASE: design]]` 格式触发
- Prism 检测到格式后，更新当前 session 的 `workflowPhase` 并刷新进度指示器
- 同时在 Console Tray 记录阶段变化

### 6.6 模块六：Console Tray（底部日志）

**高度：** 64px（收起）/ 240px（展开，点击切换）

**记录内容：**

```
[10:23:41] SYSTEM  已检测到 Claude Code（MCP 模式）
[10:23:42] SYSTEM  正在注入 Helm 规范到 CLAUDE.md...
[10:23:43] OK      System Prompt 注入成功
[10:23:55] INTENT  新功能意图："加一个退出登录按钮" → 路由到 /plobi-explore
[10:24:01] HELM    [WARN] IDE 输出包含"我先把所有表建好" → 违反垂直切片原则
[10:24:01] HELM    已自动向 IDE 注入修正指令
[10:24:15] DOC     TASK.md 已更新（切片 #2 → 完成）
[10:31:02] SYSTEM  [WARN] 上下文使用率 87%，建议执行 /plobi-grill 保存决策
```

**Helm 规范违反检测（自动）：**

Prism 解析 IDE 输出时，同步检测以下反模式：

| 检测模式 | 关键词/正则 | 触发动作 |
|---|---|---|
| 水平分层 | "先建所有表" / "先写所有 API" | Console 警告 + 向 IDE 注入修正指令 |
| 跳过测试 | "测试后面补" / "先写代码" | Console 警告 + 弹窗提示用户 |
| 直接推翻冻结需求 | 修改 CONTEXT.md 中标记为 LOCKED 的条目 | 强制拦截 + 要求用户授权 |
| 无反馈环推进 | 连续 500 字输出但无测试代码 | Console 警告 |

---

## 7. UI/UX 视觉规约

### 7.1 整体风格

莫兰迪色系极简风，参考 NotebookLM 的低饱和度冷灰调性。

```
目标用户：有工程思维、愿意学习技术概念、但不会写代码的独立开发者
定位关键词：简约克制、信息密度高、技术术语、选择权交给用户
设计原则：
  1. 界面文字最小化：能用图标表达的，不用文字
  2. 莫兰迪色系：低饱和度、柔和、专业
  3. 矢量图标：Lucide 图标库，16px/20px/24px
  4. 悬浮提示：默认隐藏，hover 显示详细说明
  5. 建议但不强制：提供推荐方案，但最终选择权在用户
目标感受：专业工具，不是聊天软件
```

### 7.2 配色系统（莫兰迪色系）

```css
/* 背景层级 - 冷灰调 */
--bg-base:        #1A1D23;   /* 主背景（比原来稍暖） */
--bg-surface:     #22262E;   /* 卡片、侧边栏 */
--bg-overlay:     #2A2F38;   /* 弹窗、下拉 */
--bg-hover:       #323842;   /* hover 状态 */

/* 边框 */
--border-default: #3D4450;   /* 标准边框 */
--border-subtle:  #2A2F38;   /* 轻量分割线 */

/* 文字 - 低对比度但可读 */
--text-primary:   #D4D8E0;   /* 主文字（柔和白） */
--text-secondary: #8B92A0;   /* 描述、标签（灰蓝） */
--text-muted:     #5A6170;   /* 占位符、禁用 */

/* 功能色 - 莫兰迪低饱和度 */
--accent-blue:    #5B7A9D;   /* 主操作（灰蓝） */
--accent-teal:    #5E8E83;   /* 成功、完成（灰绿） */
--accent-amber:   #9D8656;   /* 警告、等待（灰黄） */
--accent-rose:    #8B5E6B;   /* 错误、阻塞（灰红） */

/* 状态色 */
--status-active:  #5E8E83;   /* ACTIVE（灰绿） */
--status-pending: #9D8656;   /* PENDING（灰黄） */
--status-error:   #8B5E6B;   /* ERROR（灰红） */
--status-locked:  #5A6170;   /* LOCKED（灰） */

/* Console Tray 日志色 */
--log-system:     #8B92A0;   /* 系统日志 */
--log-ok:         #5E8E83;   /* 成功 */
--log-warn:       #9D8656;   /* 警告 */
--log-helm:       #5B7A9D;   /* Helm 规范 */
--log-doc:        #5A6170;   /* 文档更新 */
```

**配色特点：**
- 所有功能色饱和度降低 30-40%
- 避免刺眼的纯红、纯绿、纯蓝
- 整体色调统一在灰蓝/灰绿/灰黄/灰红范围内
- 长时间使用不疲劳

### 7.3 图标系统

**图标库：Lucide（线条风格，16px / 20px / 24px）**

**图标映射表：**

```typescript
// 意图类型
意图类型图标：
  新功能     →  PlusCircle / Sparkles
  修复 Bug   →  Bug / AlertCircle
  探索想法   →  Search / Compass

// 文档状态
文档卡片图标：
  任务进度   →  ListChecks
  需求定义   →  BookOpen
  设计规范   →  Palette
  调研报告   →  BarChart3
  架构决策   →  FileCheck

// 工作流阶段
阶段图标：
  需求探索   →  Search
  方案设计   →  PenTool
  编码       →  Code
  测试       →  FlaskConical
  部署       →  Rocket

// 操作状态
状态图标：
  完成       →  CheckCircle（灰绿）
  进行中     →  Loader2（旋转动画，灰蓝）
  等待       →  Pause（灰黄）
  阻塞       →  XCircle（灰红）
  警告       →  AlertTriangle（灰黄）
  信息       →  Info（灰色）
```

**绝对禁止：**
- 任何 emoji（包括状态 emoji，用 SVG 图标替代）
- 渐变色（背景和按钮）
- 超过 200ms 的动画
- 阴影（除弹窗外，弹窗使用单层 box-shadow: 0 8px 24px rgba(0,0,0,0.4)）
- 圆形头像或装饰性插图

### 7.4 字体

```css
font-family: "Inter", "SF Pro Display", system-ui, sans-serif;
font-family-mono: "JetBrains Mono", "Fira Code", monospace;

/* 尺寸体系 */
--text-xs:   11px;   /* Console Tray 日志 */
--text-sm:   13px;   /* 卡片描述、标签 */
--text-base: 14px;   /* 主体文字 */
--text-lg:   16px;   /* 卡片标题 */
--text-xl:   20px;   /* 弹窗标题 */
--text-2xl:  24px;   /* 意图输入框 */
```

### 7.5 间距与圆角

```css
/* 间距（8px 倍数体系） */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;   /* 网格卡片间距（紧凑版） */
--space-6: 24px;
--space-8: 32px;

/* 圆角 */
--radius-sm:  4px;   /* Badge、Tag */
--radius-md:  6px;   /* 按钮、输入框 */
--radius-lg:  8px;   /* 卡片 */
--radius-xl:  12px;  /* 弹窗 */
```

### 7.6 布局结构（紧凑版）

```
┌──────────────────────────────────────────────────────┐
│  Topbar（40px）                                       │
│  ◇ Prism  项目名  [⚙] [↻] [意图输入框...] [+]       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Grid Viewport（主区域，间距 16px）                   │
│  [☑ 75%] [📖] [🎨] [📊] [📝]  ← 一屏 10-12 张卡片   │
│  [📋] [📄] [📑] [📒] [📁]                            │
│                                                      │
│              ┌──── Inspector ────│                   │
│              │ （360px，右侧滑出）│                   │
│              │ [文档渲染内容]     │                   │
│              │ [状态徽章组]       │                   │
│              └───────────────────│                   │
├──────────────────────────────────────────────────────┤
│  Console Tray（48px 收起 / 200px 展开）               │
│  [✓] 已连接 Claude Code  [ℹ] 规范已注入   [展开 ∧]  │
└──────────────────────────────────────────────────────┘
```

**布局优化点：**
- Topbar 从 48px → 40px（节省 8px）
- Grid 间距从 32px → 16px（节省 16px）
- 卡片尺寸从 280px → 240px（更紧凑）
- Inspector 从 420px → 360px（节省 60px）
- Console Tray 从 64px/240px → 48px/200px
- 垂直空间增加 **15%**（约 120px @ 800px 高度）

### 7.7 交互反馈规范

**文件变化高亮：**
```css
.doc-card.changed {
  border-color: var(--status-active);
  transition: border-color 0.3s ease;
}

.doc-card.changed::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--status-active);
  animation: fade-highlight 2s ease-out forwards;
}

@keyframes fade-highlight {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
```

**骨架屏加载：**
```typescript
// Inspector 打开时立即显示骨架屏，不等 Markdown 解析
const InspectorSkeleton = () => (
  <div className="inspector-skeleton">
    <div className="skeleton-line w-3/4" />
    <div className="skeleton-line w-full" />
    <div className="skeleton-line w-5/6" />
    <div className="skeleton-table" />
  </div>
);

// 样式
.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

**悬浮提示（Tooltip）：**
```typescript
// 所有图标、按钮、卡片都支持 hover 显示详细说明
// 延迟 300ms 显示，鼠标移出后 150ms 消失
<Tooltip content="刷新文档状态" delay={300}>
  <button><RefreshCw /></button>
</Tooltip>
```

### 7.8 响应式支持

**最小窗口尺寸：1024x768**
- 适配主流笔记本屏幕
- 低于此尺寸时显示提示："建议窗口尺寸 ≥ 1024x768"

**断点系统：**
```css
/* 网格列数自适应 */
.grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

/* Inspector 在小窗口时自动缩小 */
@media (max-width: 1200px) {
  .inspector { width: 320px; }
}
```

---

## 8. 开发切片计划

**开发原则：** 每个切片必须是端到端可运行的完整功能。禁止"先建所有数据模型，下个切片再做 UI"的水平分层方式。每个切片完成后，必须能独立演示给非技术用户看。

**TDD 要求：** 每个切片先写失败测试，再写最小实现。集成测试覆盖核心路径。

**架构演进策略：**
- 状态管理：保持 local state + Zustand 混合方案，明确职责边界（local state 仅用于纯 UI 状态）
- 事件总线：渐进式引入（新代码用事件总线，老代码保持，逐步迁移）
- 快捷键配置：第一期存储在 localStorage，未来支持用户自定义

---

### 切片 #0：Electron 骨架 + 基础布局（AFK）

**完成标准：** 运行 `npm start` 能看到一个空的 Prism 窗口，包含 Topbar、空 Grid 区域、空 Console Tray，配色和字体符合第 7 节规约。

**包含内容：**
- Electron 主进程 + React 渲染进程基础配置
- Tailwind CSS + shadcn/ui 集成
- 基础布局组件：`<Topbar>` / `<GridViewport>` / `<ConsoleTray>`
- IPC 通信骨架（主进程 ↔ 渲染进程）
- 全局 Zustand store 初始化

**测试：** 渲染进程能通过 IPC 向主进程发消息，主进程回复后渲染进程正确更新 UI。

---

### 切片 #1：项目加载 + 文档资产检测（AFK）

**完成标准：** 用户选择一个本地项目目录后，Prism 能检测 Helm 文档是否存在，并在 Grid 中显示对应的状态卡片（EMPTY 状态）。Console Tray 实时打印检测日志。

**包含内容：**
- 目录选择器（`dialog.showOpenDialog`）
- Helm 文档检测逻辑（`DocManager.scan()`）
- 首次检测显示"全新项目"或"已有文档"的确认弹窗
- Grid 渲染：7 张文档卡片，状态为 EMPTY / STALE
- Console Tray 打印：`SYSTEM: 已扫描项目，发现 3 个现有文档`

**测试：** 给定一个空目录，7 张卡片全部显示 EMPTY。给定一个已有 TASK.md 的目录，对应卡片显示正确内容。

---

### 切片 #2：chokidar 文件监听 + 网格实时刷新（AFK）

**完成标准：** 在外部编辑器修改 TASK.md 后，Prism 的 TASK.md 卡片在 1 秒内自动更新，无需手动刷新。Console Tray 打印变化日志。

**包含内容：**
- `chokidar` 集成，监听 Helm 文档目录
- IPC 事件：`helm-doc-changed`
- Grid 卡片的响应式更新（不重新渲染整个 Grid，只更新变化的卡片）

**测试：** 模拟文件写入事件，验证 IPC 消息在 1 秒内到达渲染进程，卡片内容更新。

---

### 切片 #3：Inspector 侧边栏（AFK）

**完成标准：** 点击任意文档卡片，右侧滑出 420px 的 Inspector，显示该文档的 Markdown 渲染内容。按 ESC 或再次点击收起。动画流畅（150ms）。

**包含内容：**
- `<InspectorPanel>` 组件
- `framer-motion` 滑出动画
- `react-markdown` + `remark-gfm` 集成（支持表格、任务列表、代码块）
- ESC 键盘监听

**测试：** 点击卡片后，Inspector 在正确位置渲染，Markdown 表格正确显示为 HTML 表格，ESC 关闭后卡片状态复位。

---

### 切片 #4：Claude Code 适配器 + MCP 集成（HITL）

**HITL 决策点：** MCP Server 的端口分配策略、`CLAUDE.md` 的写入路径（项目级 or 用户级）需要与你确认。

**完成标准：** 在已安装 Claude Code 的环境中，Prism 能检测到 Claude Code 运行，注入基础 Helm System Prompt 到 `CLAUDE.md`，并在 Console Tray 显示"Claude Code 已连接（MCP 模式）"。

**包含内容：**
- `ClaudeCodeAdapter` 实现（`IDEAdapter` 接口）
- MCP Server 启动逻辑（本地 HTTP + stdio 双模式）
- `prism_read_context` / `prism_write_decision` / `prism_ask_user` MCP 工具
- `CLAUDE.md` 写入（Helm 规范 System Prompt 模板）
- IDE 切换选项框（Topbar，第一期只显示 Claude Code）

**测试：** 启动 Prism，验证 MCP Server 在指定端口运行，向其发送 `prism_read_context` 请求返回正确格式。

---

### 切片 #5：意图输入 + 工作流路由（AFK）

**完成标准：** 在 Topbar 输入"我想加一个退出登录按钮"，Prism 分类为"新功能"，在 Console Tray 显示路由结果，并显示静默推演提示（不打开 IDE session，下一切片完成后才打开）。

**包含内容：**
- `<IntentInput>` 组件（带 placeholder："描述你的意图……"）
- `classifyIntent()` 本地分类函数
- 静默推演提示动画（居中文字提示，2 秒后自动消失）
- Zustand 存储当前意图和分类结果

**测试：** 给定 10 个不同意图输入，验证分类准确率（手动标注预期分类）。

---

### 切片 #6：QUESTION 格式解析 + 弹窗渲染（AFK）

**完成标准：** 给定一段包含 `[[PRISM_QUESTION]]` 格式的文本，Prism 能正确渲染对应类型的弹窗，用户点击选项后，Console Tray 显示用户的选择结果。（此切片不涉及真实 IDE 连接，用 mock 数据测试）

**包含内容：**
- `parseQuestionBlocks()` 纯函数（输入：原始文本，输出：Question 对象数组）
- `<ChoiceModal>` / `<MultiSelectModal>` / `<ConfirmModal>` 弹窗组件
- 弹窗队列管理（一次只显示一个，用户回复后显示下一个）
- "其他想法"输入框的处理

**测试：** 单元测试 `parseQuestionBlocks()`，覆盖：标准格式、多个 QUESTION 块、无 QUESTION 块、格式不完整的容错处理。

---

### 切片 #7：意图 → Claude Code Session 创建 + QUESTION 弹窗联通（HITL）

**HITL 决策点：** 首次联通时需要你实际操作验证 Claude Code 响应是否符合预期。

**完成标准：** 完整流程可以运行：输入意图 → Prism 打开 Claude Code 新 session → Claude Code LLM 输出 QUESTION 格式 → Prism 弹窗显示 → 用户点选 → Prism 把选择发回 Claude Code。

**包含内容：**
- `adapter.openSession()` 实现
- `adapter.watchOutput()` 实现（轮询间隔 500ms）
- `adapter.sendMessage()` 实现
- System Prompt 模板：包含 `/plobi-explore` 规范 + QUESTION 格式约束
- 工作流进度指示器（Topbar 右侧，显示当前 Phase）

---

### 切片 #8：TASK.md 切片状态控制台（AFK）

**完成标准：** 打开 TASK.md 的 Inspector 时，底部显示切片状态徽章组，点击"完成"后 TASK.md 文件原子写入更新，Grid 卡片同步刷新进度条。

**包含内容：**
- TASK.md 的 Markdown 表格解析（提取切片 ID 和当前状态）
- `<TaskStatusBadges>` 组件
- 原子写入逻辑（tmp 文件 + rename）
- Grid 卡片进度条渲染

**测试：** 给定一个标准格式的 TASK.md，验证解析出正确的切片列表；模拟点击"完成"，验证文件内容正确更新。

---

### 切片 #9：项目初始化流程（全新项目 + 已有项目迁移）（AFK）

**完成标准：** 首次打开一个空项目，Prism 创建完整的 Helm 文档结构，Git Hook 安装成功，Console Tray 显示完成日志。打开一个已有 README.md 的项目，Prism 提取内容并迁移到 CONTEXT.md，显示迁移摘要弹窗。

**包含内容：**
- `DocManager.initialize()` 全新初始化
- `DocManager.migrate()` 已有文档迁移
- Git Hook 写入（`pre-push` / `pre-commit`）
- 迁移摘要弹窗（列出迁移了什么）

---

### 切片 #10：Cursor 适配器（AFK）

**完成标准：** IDE 切换选项框新增"Cursor"，选择后 Prism 检测 Cursor 是否运行，注入 `.cursor/rules`，后续 QUESTION 弹窗流程与 Claude Code 一致。

**包含内容：**
- `CursorAdapter` 实现
- `.cursor/rules` 写入
- Cursor chat 历史目录监听
- IDE 切换选项框更新

---

### 切片 #11：Windsurf 适配器（AFK）

与切片 #10 类似，实现 `WindsurfAdapter`。

---

### 切片 #12：上下文快满检测 + 强制 grill 弹窗（AFK）

**完成标准：** 当 IDE 输出速度明显下降或输出包含 `[[CONTEXT_WARNING]]` 时，Prism 显示"上下文快满"特殊弹窗，用户点击"写入 ADR 并保存"后，待确认决策自动写入 `docs/adr/` 目录。

---

### 切片 #13：Antigravity 适配器（AFK）

最后实现，前置依赖切片 #10 和 #11 的适配器模式验证。

---

### 切片 #14：快捷键系统 + 命令面板（AFK）

**完成标准：** 用户可以通过键盘快捷键完成 80% 的常用操作，无需鼠标。命令面板（Cmd/Ctrl+K）支持模糊搜索所有可用命令。

**包含内容：**
- `<CommandPalette>` 组件（Raycast 风格，居中弹窗，模糊搜索）
- 快捷键注册系统（`useHotkeys` hook）
- 第一期快捷键清单：
  ```
  Cmd/Ctrl+K        打开命令面板
  Cmd/Ctrl+1~7      快速选择网格中的文档卡片
  Cmd/Ctrl+Enter    提交意图输入
  ESC               关闭弹窗/侧边栏/命令面板
  Cmd/Ctrl+L        聚焦 Console Tray
  Cmd/Ctrl+O        打开项目目录
  Cmd/Ctrl+R        刷新文档状态
  Cmd/Ctrl+I        聚焦意图输入框
  ```
- 命令面板功能清单：
  ```
  - 切换 IDE（Claude Code / Cursor / Windsurf）
  - 打开文档（TASK.md / CONTEXT.md / DESIGN.md ...）
  - 执行操作（刷新文档 / 打开项目 / 清空日志）
  - 导航（下一个阶段 / 上一个阶段 / 跳转到 Phase X）
  ```
- 快捷键冲突处理：仅在输入框未聚焦时生效（输入框内使用浏览器默认快捷键）

**测试：** 模拟键盘事件，验证每个快捷键触发正确的行为；命令面板模糊搜索准确率（测试 20 个常用命令）。

**技术要点：**
- 使用 ` Mousetrap` 或自定义 hook（不引入额外依赖）
- 快捷键配置存储在 `localStorage`（未来支持用户自定义）
- 命令面板支持键盘上下选择 + Enter 执行

---

### 切片 #15：意图输入增强（AFK）

**完成标准：** 用户在意图输入框输入时，按 Tab 键触发自动补全，输入停止 500ms 后显示意图分类预览。

**包含内容：**
- `<IntentAutocomplete>` 组件（Tab 触发，下拉显示模板）
- `<IntentPreview>` 组件（实时显示分类结果和触发的 Helm skill）
- 意图模板库（硬编码 + `.prism/intent-templates.json` 用户自定义）
- 意图历史功能（Cmd/Ctrl+Shift+H 显示最近 10 个意图）
- 去抖逻辑（输入停止 500ms 后才更新分类预览）

**意图模板示例：**
```json
{
  "templates": [
    {
      "label": "加一个退出登录按钮",
      "category": "feature",
      "phase": "explore",
      "skill": "/plobi-explore"
    },
    {
      "label": "修复登录崩溃问题",
      "category": "bugfix",
      "phase": "debug",
      "skill": "/plobi-dissect"
    },
    {
      "label": "探索用户权限系统",
      "category": "explore",
      "phase": "explore",
      "skill": "/plobi-explore"
    }
  ]
}
```

**意图预览 UI：**
```
┌─────────────────────────────────────────┐
│ 我想加一个退出登录按钮                   │
│ ─────────────────────────────────────── │
│ 分类：新功能 | 触发：/plobi-explore     │
│ 预计阶段：Phase 1 → Phase 7             │
└─────────────────────────────────────────┘
```

**测试：** 给定 10 个意图输入，验证 Tab 补全准确率；验证去抖逻辑（快速输入 10 个字符，只触发 1 次分类）。

---

### 切片 #16：状态持久化（AFK）

**完成标准：** 关闭 Prism 窗口后重新打开，自动恢复上次打开的项目、IDE 选择、窗口位置。

**包含内容：**
- `PersistedState` 接口定义：
  ```typescript
  interface PersistedState {
    lastProject: string;              // 最后打开的项目路径
    lastIde: string;                  // 最后使用的 IDE
    recentIntents: Array<{            // 最近 10 个意图
      text: string;
      classification: IntentType;
      timestamp: Date;
    }>;
    windowPositions: Record<string, {
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    consoleTrayExpanded: boolean;     // Console Tray 展开状态
    inspectorWidth: number;           // Inspector 宽度（未来支持调整）
  }
  ```
- `electron-store` 集成（或简单 JSON 文件存储到 `~/.prism/state.json`）
- 启动时恢复状态逻辑：
  ```
  Step 1：读取 ~/.prism/state.json
  Step 2：恢复 lastIde（设置 activeIde）
  Step 3：如果 lastProject 存在，自动扫描并加载
  Step 4：恢复窗口位置（如果窗口位置有效）
  Step 5：恢复 recentIntents（用于意图历史）
  ```
- 状态保存策略：
  ```
  - 每次关键操作后保存（切换 IDE、打开项目、提交意图）
  - 窗口关闭前保存（before-quit 事件）
  - 每 30 秒自动保存一次（防崩溃丢失）
  ```

**测试：** 模拟关闭/打开窗口，验证状态正确恢复；模拟崩溃场景（直接 kill 进程），验证最近 30 秒内的状态不丢失。

---

### 切片 #17：智能文档预览（AFK）

**完成标准：** 鼠标悬停文档卡片 300ms 后显示浮动预览，文件变化时新修改的行高亮显示 2 秒。

**包含内容：**
- `<DocHoverPreview>` 组件（浮动预览，280px 宽度）
- 悬停触发逻辑（300ms 延迟，鼠标移出后 150ms 消失）
- 差异高亮逻辑：
  ```typescript
  interface DocChangeHighlight {
    filePath: string;
    changedLines: number[];  // 变化的行号
    highlightUntil: Date;    // 高亮持续到何时（当前时间 + 2 秒）
  }
  ```
- Inspector 快速操作按钮：
  ```
  [📋 复制] [🔍 在文件管理器中打开] [✏️ 在 IDE 中编辑] [📊 导出为 PDF]
  ```
- Markdown 渲染优化（代码块语法高亮、表格滚动）

**预览 UI：**
```
┌─────────────────────────────┐
│ TASK.md                     │
│ ─────────────────────────── │
│ # 任务进度                  │
│                             │
│ | 切片 | 状态 | 负责人 |   │
│ | #1   | Done | AFK    |   │
│ | #2   | Done | AFK    |   │
│ | #3   | ← 新修改行高亮    │
│                             │
│ 最后修改：2 分钟前          │
└─────────────────────────────┘
```

**测试：** 模拟鼠标悬停事件，验证 300ms 后显示预览；模拟文件变化，验证变化行高亮 2 秒后淡出。

---

### 切片 #18：UI/UX 重构（莫兰迪色系 + 简约克制）（AFK）

**完成标准：** 全面升级 Prism 的视觉系统，采用莫兰迪色系、紧凑布局、矢量图标、悬浮提示，信息密度提升 15%，同时保持技术术语和专业感。

**包含内容：**

#### #18A：配色系统升级（0.5 天）
- 全局 CSS 变量替换为莫兰迪色系
- 验证所有组件在新配色下的可读性
- 调整对比度确保符合 WCAG AA 标准（至少 4.5:1）
- 移除所有硬编码颜色值，统一使用 CSS 变量

#### #18B：图标系统重构（0.5 天）
- 替换所有 emoji 为 Lucide 矢量图标
- 创建图标映射表（见 7.3 节）
- 实现 Tooltip 组件（hover 300ms 显示，移出 150ms 消失）
- 为所有图标、按钮、卡片添加 Tooltip

#### #18C：布局紧凑化（1 天）
- Topbar 从 48px → 40px
- Grid 间距从 32px → 16px
- 卡片尺寸从 280px → 240px
- Inspector 从 420px → 360px
- Console Tray 从 64px/240px → 48px/200px
- 验证一屏可显示 10-12 张卡片

#### #18D：Console Tray 重构（0.5 天）
- 日志格式从技术术语 → 自然语言 + 图标
- 实现图标映射：`[✓]` `[⏳]` `[⚠]` `[→]` `[x]` `[i]`
- 警告日志添加左侧边框高亮（2px accent-amber）
- 收起状态显示最近 2 条关键日志

#### #18E：交互反馈优化（1 天）
- 文件变化高亮动画（border-color + 顶部 2px 高亮，2 秒淡出）
- Inspector 骨架屏加载（shimmer 动画）
- 意图提交内联进度（发送按钮变 loader，Topbar 显示小字提示）
- 文档卡片 hover 效果（border-color 变化 + 轻微阴影）

**测试：**
- 配色对比度测试：所有文字/背景组合符合 WCAG AA
- 图标渲染测试：所有 Lucide 图标在 16px/20px/24px 下清晰
- 布局响应式测试：1024x768 下功能完整
- 动画性能测试：所有动画 < 200ms，无卡顿

---

## 9. 测试规约

### 9.1 测试策略

```
单元测试（Jest）：
  - 所有纯函数（parseQuestionBlocks / classifyIntent / extract 系列）
  - 原子写入逻辑
  - Markdown 表格解析

集成测试（Electron 主进程）：
  - IPC 通信（主进程 ↔ 渲染进程）
  - 文件监听 → IPC → UI 更新的完整链路
  - 各 IDEAdapter 的 detect() 和 injectSystemPrompt()（用 mock 文件系统）

E2E 测试（Playwright for Electron）：
  - 完整的"输入意图 → 弹窗 → 点击 → TASK.md 更新"流程
  - Inspector 打开/关闭行为
  - Grid 实时刷新

TDD 规则：
  每个切片在写实现之前，必须先有失败测试。
  测试文件与实现文件同目录，命名：{file}.test.ts
```

### 9.2 关键测试用例（必须覆盖）

```typescript
// parseQuestionBlocks — 必须覆盖这 5 个 case
describe('parseQuestionBlocks', () => {
  it('解析标准 choice 格式');
  it('解析多个连续 QUESTION 块');
  it('空字符串输入返回空数组');
  it('格式不完整时优雅降级（不崩溃）');
  it('LLM 包裹 Markdown 代码块时正确剥离');
});

// 原子写入
describe('atomicWrite', () => {
  it('写入成功后内容正确');
  it('写入中断后原文件不损坏');
  it('并发写入时不产生竞态');
});
```

---

## 10. 文件结构

```
prism/
├── electron/
│   ├── main.ts                    # Electron 主进程入口
│   ├── ipc/
│   │   ├── helm-docs.ts           # Helm 文档相关 IPC 处理
│   │   ├── ide-adapter.ts         # IDE 适配器相关 IPC
│   │   └── session.ts             # Session 管理 IPC
│   ├── adapters/
│   │   ├── interface.ts           # IDEAdapter 接口定义
│   │   ├── claude-code.ts         # Claude Code 适配器（MCP）
│   │   ├── cursor.ts              # Cursor 适配器
│   │   ├── windsurf.ts            # Windsurf 适配器
│   │   └── antigravity.ts         # Antigravity 适配器
│   ├── doc-manager/
│   │   ├── index.ts               # DocManager 主入口
│   │   ├── scanner.ts             # 文档检测与扫描
│   │   ├── migrate.ts             # 已有文档迁移逻辑
│   │   ├── watcher.ts             # chokidar 文件监听
│   │   └── atomic-write.ts        # 原子写入实现
│   └── helm/
│       ├── question-parser.ts     # QUESTION 格式解析
│       ├── intent-classifier.ts   # 意图分类
│       ├── system-prompts/        # 各阶段的 System Prompt 模板
│       │   ├── explore.md
│       │   ├── grill.md
│       │   ├── design.md
│       │   ├── slice.md
│       │   ├── code.md
│       │   └── debug.md
│       └── violation-detector.ts  # Helm 规范违反检测
├── src/                           # React 渲染进程
│   ├── App.tsx
│   ├── App.css                    # 全局样式（莫兰迪色系 CSS 变量）
│   ├── store/
│   │   ├── session.ts             # Zustand session store
│   │   ├── helm-docs.ts           # Zustand 文档状态 store
│   │   └── ui.ts                  # Zustand UI 状态 store
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Topbar.tsx
│   │   │   ├── GridViewport.tsx
│   │   │   ├── InspectorPanel.tsx
│   │   │   └── ConsoleTray.tsx
│   │   ├── cards/
│   │   │   ├── DocCard.tsx
│   │   │   └── TaskProgressCard.tsx
│   │   ├── modals/
│   │   │   ├── ChoiceModal.tsx
│   │   │   ├── MultiSelectModal.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── ContextWarningModal.tsx
│   │   ├── command/
│   │   │   ├── CommandPalette.tsx      # 命令面板（切片 #14）
│   │   │   └── useHotkeys.ts           # 快捷键 hook（切片 #14）
│   │   ├── intent/
│   │   │   ├── IntentAutocomplete.tsx  # 意图自动补全（切片 #15）
│   │   │   └── IntentPreview.tsx       # 意图预览（切片 #15）
│   │   ├── inspector/
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── TaskStatusBadges.tsx
│   │   │   └── DocHoverPreview.tsx     # 悬停预览（切片 #17）
│   │   ├── preview/
│   │   │   └── DocHoverPreview.tsx     # 浮动预览组件（切片 #17）
│   │   └── common/
│   │       ├── Tooltip.tsx             # 悬浮提示组件（切片 #18B）
│   │       └── Skeleton.tsx            # 骨架屏组件（切片 #18E）
│   └── lib/
│       ├── ipc-client.ts          # 渲染进程 IPC 调用封装
│       ├── intent-templates.json  # 意图模板库（切片 #15）
│       ├── state-persist.ts       # 状态持久化工具（切片 #16）
│       └── icons.ts               # 图标映射表（切片 #18B）
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── electron-builder.json
└── PRISM_PROJECT.md               # 本文档
```

---

## 11. 未解决决策（待 grill）

以下决策尚未确认，在对应切片开始前必须先过 `/plobi-grill`：

| 编号 | 决策问题 | 影响切片 | 备注 |
|---|---|---|---|
| D-001 | Windsurf 的对话历史文件具体路径（不同操作系统可能不同） | #11 | 需要在 Windsurf 环境中实测 |
| D-002 | Antigravity 的 Rules 文件路径和格式 | #13 | 需要查阅 Antigravity 官方文档 |
| D-003 | MCP Server 端口冲突时的策略（动态分配 or 固定端口 + 冲突提示） | #4 | 影响 Claude Code 适配器稳定性 |
| D-004 | `CLAUDE.md` 写入位置：项目级（每个项目一个）vs 用户级（全局共享） | #4 | 项目级更安全，但用户级更方便 |
| D-005 | ~~Prism 的多窗口是多个 `BrowserWindow` 还是单窗口内的 Tab 管理~~ | #0 | ✅ 已确认：多 BrowserWindow 物理隔离 |
| D-006 | ~~意图分类是否需要调用 LLM（更准确）还是纯本地关键词（更快更离线）~~ | #5 | ✅ 已确认：纯本地关键词分类 |
| D-007 | Cursor 的发送消息机制（CLI 接口 or 写入队列文件）需要实测验证 | #10 | Cursor 官方未完整开放此 API |
| D-008 | ~~快捷键库选择：Mousetrap（成熟但额外依赖）vs 自定义 hook（轻量但需自己实现）~~ | #14 | ✅ 已确认：自定义 hook（零依赖） |
| D-009 | ~~状态持久化存储方案：electron-store（功能全）vs 简单 JSON 文件（轻量）~~ | #16 | ✅ 已确认：简单 JSON 文件（~/.prism/state.json） |
| D-010 | 图标 Tooltip 延迟时间：300ms（默认）vs 可配置 | #18B | 影响悬浮提示体验 |

---

## 附录 A：Helm System Prompt 模板示例

以下是注入到 IDE 的 System Prompt 基础结构（完整模板在 `electron/helm/system-prompts/` 目录）：

```markdown
# Prism Helm 工作流约束

你正在被 Prism 管理。以下规范是强制约束，不是建议。

## 当前任务上下文
- 任务类型：{{taskType}}
- 当前阶段：{{currentPhase}}
- 项目文档摘要：
{{contextSummary}}

## 核心规范

### 追问规范
- 当你需要向用户提问时，必须使用以下格式，禁止用自然语言提问：
  [[PRISM_QUESTION]]
  type: choice | confirm | input | multi_select
  phase: {{currentPhase}}
  title: [你的问题]
  options:
    - label: A. [选项]
      detail: [一句话说明]
    - label: B. [选项]
      detail: [一句话说明]
    - label: C. 其他想法
      input: true
  [[/PRISM_QUESTION]]
- 每次只输出一个 QUESTION 块，等待回复后再继续

### 阶段切换规范
- 切换 Helm 阶段时，输出：[[PRISM_PHASE: {phaseName}]]

### 编码规范
- 禁止在没有失败测试的情况下修改生产代码
- 禁止水平分层（"先建所有表"等）
- 每个 Issue 必须是垂直切片（从数据库到 UI 到测试）
- 完成切片后输出：[[PRISM_TASK_DONE: {taskId}]]

### 文档写入规范
- 所有决策必须写入物理文档，禁止只在对话中表达
- 上下文使用率高时，主动输出：[[CONTEXT_WARNING]]

## 当前项目 TASK.md 摘要
{{taskSummary}}
```

---

*本文档版本：0.3.0-alpha*
*最后更新：2026-05-27，UI/UX 全面重构（莫兰迪色系 + 简约克制）*
*下一步：执行切片 #14（快捷键系统），完成后更新本文档版本为 0.3.0-beta*
