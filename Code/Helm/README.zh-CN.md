# Plobi — 工程主权工作流

**人类掌握主权，AI 执行冲刺，物理文档对抗幻觉。**

[English](README.md) | [简体中文](README.zh-CN.md)

---

Plobi 是一个结构化软件开发工作流，专为人类与 AI 协作设计。它让你（人类）对"做什么"拥有战略控制权，同时让 AI 在明确边界内处理战术实现细节。

## 快速开始

### 1. 选择你的工具

| 工具 | 设置方式 | 说明 |
|------|---------|------|
| **Claude Code** | 复制 `adapters/claude-code/` skills 到 `~/.claude/skills/` | [README](adapters/claude-code/README.md) |
| **Cursor** | 复制 `.cursorrules` 到项目根目录 | [README](adapters/cursor/README.md) |
| **Windsurf** | 复制 `.windsurfrules` 到项目根目录 | [README](adapters/windsurf/README.md) |
| **VSCode + Copilot** | 复制 `copilot-instructions.md` 到 `.github/` | [README](adapters/vscode-copilot/README.md) |
| **Antigravity** | 内联引用 prompts | [README](adapters/antigravity/README.md) |
| **其他 AI 工具** | 直接使用 `prompts/` | 参考 `core/principles.md` + `prompts/[skill].md` |

### 2. 初始化项目

```text
阶段 0: 初始化
  1. Guard     — 防止危险 git 操作
  2. Scaffold  — 创建 .docs/ 和 .ai/ 文件夹及模板
  3. Templates — 复制会话模板到 .ai/SESSION_TEMPLATES.md（可选）
  4. Compress  — 启用极简模式（可选）
```

### 3. 运行 6 阶段工作流

```text
阶段 1: 设计    → 发散需求，grill 直至收敛，撰写 PROJECT.md
阶段 2: 规划    → UI 规范，垂直切片拆分
阶段 3: 开发    → 新代码用 TDD，遗留代码用特征化测试
阶段 4: 扩展    → L1-L4 功能添加
阶段 5: 修复    → 六阶段系统性诊断
阶段 6: 优化    → 架构扫描，债务跟踪
```

完整工作流文档：[`core/workflow.md`](core/workflow.md) | [`core/workflow.zh.md`](core/workflow.zh.md)

## 仓库结构

```text
plobi/
├── core/                          # 工具无关核心
│   ├── principles.md              # 核心原则
│   ├── glossary.md                # 领域术语
│   ├── workflow.md                # 完整 6 阶段工作流（英文）
│   └── workflow.zh.md             # 完整 6 阶段工作流（中文）
├── prompts/                       # 工具无关 skill prompt
│   ├── compress.md
│   ├── explore.md
│   ├── recon.md
│   ├── grill.md
│   ├── design.md
│   ├── synthesize.md
│   ├── slice.md
│   ├── freeze.md
│   ├── thaw.md                    # 遗留代码接入
│   ├── dissect.md
│   ├── fuse.md
│   ├── map.md
│   ├── package.md
│   ├── tidy.md
│   ├── scaffold.md
│   └── forge.md
├── docs/                          # 文档模板
│   ├── PROJECT.md                 # 项目开发书
│   ├── PROGRESS.md                # 任务进度跟踪
│   ├── ARCHITECTURE.md            # 架构图
│   ├── CONTEXT.md                 # 项目上下文（用于 .ai/）
│   ├── DESIGN.md                  # UI 设计规范
│   └── RESEARCH.md                # 技术调研
├── templates/                     # 会话开场白模板
│   └── SESSION_TEMPLATES.md       # 自动填充的开场消息
├── decisions/                     # 决策记录（已采纳 + 已否决）
│   ├── adr/                       # 架构决策记录
│   └── veto/                      # 被否决的决策
├── adapters/                      # 工具特定实现
│   ├── claude-code/               # 原生 skill 系统
│   ├── cursor/                    # .cursorrules + @prompts
│   ├── windsurf/                  # .windsurfrules
│   ├── vscode-copilot/            # copilot-instructions.md
│   └── antigravity/               # 内联 prompt 引用
└── examples/                      # 示例项目配置
```

## 18 个 Skill

| Skill | 阶段 | 用途 |
|-------|------|------|
| **guard** | 0 | 拦截危险 git 操作 |
| **scaffold** | 0 | 创建项目结构和模板 |
| **compress** | 全阶段 | 极简通信模式 |
| **explore** | 1 | 发散需求探索 |
| **recon** | 1 | 市场与技术调研 |
| **grill** | 1, 2, 5 | 审讯式追问直至收敛 |
| **design** | 2 | UI/UX 设计规范 |
| **synthesize** | 2 | 从上下文生成 PRD |
| **slice** | 2 | 将 PRD 拆成垂直切片 |
| **freeze** | 3 | 新代码的 TDD 红绿重构 |
| **thaw** | 3 | 遗留代码接入与隔离 |
| **dissect** | 5 | 六阶段 Bug 诊断 |
| **fuse** | 3, 6 | 架构改进扫描 |
| **map** | 任意 | 代码库模块地图 |
| **tidy** | 任意 | 强制结构整洁和命名规范 |
| **package** | 任意 | 跨会话交接（写 SESSION.md） |
| **resume** | 任意 | 新会话初始化（读 SESSION.md + 生成开场白） |
| **forge** | 元 | 创建新 skill |

## 核心概念

### 文档分层
- `.docs/` — 操作者视图：PROJECT.md、PROGRESS.md、ARCHITECTURE.md、DESIGN.md
- `.ai/` — AI 执行上下文：`.ai/CONTEXT.md`、`.ai/DECISIONS/`、`.ai/TESTS/`、`.ai/DEBT.md`、`.ai/SESSION.md`、`.ai/SESSION_TEMPLATES.md`

### 上下文隔离（会话管理）

不同类型的任务用不同的会话窗口。一窗一事。

| 会话类型 | 用于 | 不要混用 |
|---------|------|---------|
| **Feature** | 编码、设计、实现 | 环境修复、调试 |
| **Debug** | Bug 诊断、报错修复 | 新需求、功能开发 |
| **Environment** | 安装依赖、配置工具链 | 业务逻辑、写代码 |
| **Explore** | 读代码、调研、理解架构 | 实现、改代码 |
| **Review** | 代码审查、验收测试 | 修改实现 |

**切窗信号：** 话题变化、10 轮未解决、AI 循环建议、架构推翻。

**跨窗接力：** 所有状态存在 `.ai/SESSION.md`。新窗口从读 SESSION.md + SESSION_TEMPLATES.md + PROJECT.md 开始。绝不依赖 AI "记忆"。

### 垂直切片
每个任务都是一个端到端、可演示的功能（数据库 + API + UI + 测试）—— 不是水平分层。

### 扩展分级
| 级别 | 类型 | 示例 | 流程 |
|------|------|------|------|
| **L1** | 配置 | 添加 Agent、更改模型 | AI 自动执行 |
| **L2** | 插件 | 安装 MCP 工具 | AI 自动执行 |
| **L3** | 组件 | 新预览类型、UI 面板 | 简化设计 |
| **L4** | 核心 | 新协议、架构 | 完整阶段 1-3 |

### 冻结线
决策一旦写入 `.ai/CONTEXT.md` 或 `.docs/PROJECT.md` 即进入冻结状态。只能追加，不能修改。如需更改：迷你 grill + ADR 说明原因。

### 否决
被否决的决策被永久记录。后续会话在重新讨论前必须先检查。

### 反馈格式
结构化 Bug 报告防止"修好一个，坏掉两个"：

```text
[位置] 哪个页面/功能
[操作] 我做了什么
[期望] 我以为会发生什么
[实际] 实际发生了什么
[影响] 严重程度（影响使用 / 体验不好 / 小细节）
```

## 设计哲学

1. **你决定做什么。** AI 决定怎么做。
2. **物理文档优于记忆。** 所有上下文存在于文件中。会话结束，文档永存。
3. **测试即反馈环。** 没有通过/失败信号就没有进展。
4. **一次一个切片。** 完成并验证后再继续。
5. **遗留代码不是垃圾。** 特征化、隔离、替换 —— 永远不要在没有安全网的情况下重写。

## 贡献

Plobi 是一个从真实项目中演化而来的个人工作流。要贡献：

1. 在真实项目中使用它
2. 识别摩擦点
3. 通过工作流本身提出变更（explore → grill → synthesize → slice → freeze）

## 许可证

MIT — 自由使用、修改、分享。注明出处即感激。
