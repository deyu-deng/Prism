# 竞品更新检查报告

生成时间: 2026-06-11T10:30:00.000Z
检查周期: 2026-06-05 至 2026-06-11

## 概览

| 项目 | Stars | Forks | 最新版本 | 版本发布时间 | 变化 |
|------|-------|-------|----------|--------------|------|
| [obra/superpowers](https://github.com/obra/superpowers) | ~218k | ~19k | v5.1.0 | 5/5/2026 | 无 |
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | ~170k | ~20k | v1.16.2 | 6/5/2026 | **新版本** |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | ~53k | ~3.7k | v1.4.1 | 6/3/2026 | 无 |
| [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) | ~5.6k | ~730 | - | - | 新提交 |
| [github/spec-kit](https://github.com/github/spec-kit) | ~109k | ~9.6k | v0.10.1 | 6/9/2026 | **新版本** |

## 详细更新

### obra/superpowers

- **GitHub**: https://github.com/obra/superpowers
- **最新版本**: v5.1.0 (5/5/2026)
- **本周期变化**: 无新发布
- **备注**: 项目保持稳定迭代节奏，v5.1.0 仍是最新版本

---

### anomalyco/opencode

- **GitHub**: https://github.com/anomalyco/opencode
- **最新版本**: v1.16.2 (6/5/2026) ← **更新**
- ** Stars**: ~170k | **Forks**: ~20k

#### 新版本详情

**v1.16.2 (6/5/2026)**
- 修复 reasoning summaries 在不支持的 provider 上运行导致 GPT-5 请求失败
- 修复 edit operations 误匹配可能覆盖错误代码的问题
- 修复 Bedrock sessions 在模型响应开始前挂起的问题
- Diff viewer 新增上一/下一 hunk 导航
- 终端主题在 live reload 后正确刷新
- 支持将运行中的 subagent 发送到后台继续工作
- Sessions 在长对话期间持久化系统上下文更新
- 新增 Snowflake Cortex provider 支持
- 感谢 5 位社区贡献者

**v1.16.0 (6/5/2026)**
- 新增托管 workspace 克隆功能，保留 dirty 和 untracked 文件
- 新增 sessions 在 workspace 和目录之间移动
- 新增通过 AWS Bedrock 的完整 OpenAI 模型支持
- 新增 skill discovery 和基于文件的 agent 加载
- 新增 `run --replay` 交互式 session 回放
- 启动时间优化 38% (@StarpTech)
- 新增 Desktop 颜色主题
- 新增 thinking level selector for v2 prompts
- 新增 Settings 中的 Servers tab
- 感谢 10 位社区贡献者

#### 社区活跃度
- Release 间隔极短，几乎每天都有新版本
- 社区贡献活跃，v1.16.0 有 10 位贡献者，v1.16.2 有 5 位贡献者

---

### Fission-AI/OpenSpec

- **GitHub**: https://github.com/Fission-AI/OpenSpec
- **最新版本**: v1.4.1 (6/3/2026)
- ** Stars**: ~53k | **Forks**: ~3.7k
- **本周期变化**: 无新发布（v1.4.0 在 6/1 发布了 Kimi CLI 和 Mistral Vibe 支持）

#### 近期版本回顾

**v1.4.1 (6/3/2026)** - Bugfix
- 修复 `openspec update` 在有自定义 `workspace.yaml` 的项目（如 Dagster）中无法正常运行的问题

**v1.4.0 (6/1/2026)**
- 新增 Kimi CLI 支持
- 新增 Mistral Vibe 支持
- Sync skills 默认启用
- 改进 validation hints
- 修复大小写不敏感的 requirement headers
- 修复 oh-my-zsh 环境下的 zsh completions
- 感谢 5 位新贡献者

---

### vercel-labs/open-agents

- **GitHub**: https://github.com/vercel-labs/open-agents
- ** Stars**: ~5.6k | **Forks**: ~730
- **最新版本**: 无正式 Release
- **本周期变化**: 有新的 commit 活动

#### 近期 Commits (6/4-6/11 期间)

**6/4/2026**
- PNPM 包管理迁移 (@blurrah, PR #889)

**5/22/2026**
- Web fetch tool 需要审批才能使用 (@nicoalbanese, PR #886)

**5/18/2026**
- Chat workflow 启动并行化 (@nicoalbanese, PR #884)
- Workflow beta stream 处理更新 (@nicoalbanese, PR #883)

#### 其他近期改进
- Sandbox actions 懒加载启动
- Session 创建时开始 sandbox 预配置
- Git fetch stderr 处理修复
- DeepSec 安全修复
- GitHub Octokit 重构以改进 GitHub 交互
- AI Gateway attribution headers
- 沙箱运行时资源配置可按 profile 部署

---

### github/spec-kit

- **GitHub**: https://github.com/github/spec-kit
- **最新版本**: v0.10.1 (6/9/2026) ← **更新**
- ** Stars**: ~109k | **Forks**: ~9.6k

#### 新版本详情

**v0.10.1 (6/9/2026)**
- DocGuard CDD Enforcement extension 更新至 v0.25.1
- a11y-governance preset 更新至 v0.3.0
- Linear Integration 更新至 v0.3.0 (仓库重命名为 spec-kit-linear-sync)
- 新增 spec persistence models 文档
- 状态报告功能 (PR #2674)

**v0.10.0 (6/9/2026)** - 重大更新
- Git extension 改为可选安装（移除 `--no-git` 标志）
- 移除 legacy AI 标志 (`--ai`, `--ai-commands-dir`, `--ai-skills`)，改用 `--integration` 和 `--integration-options`
- 每个事件 hook 列表支持优先级排序
- 感谢 4 位贡献者

**v0.9.5 (6/5/2026)**
- 新增 bundled bug triage workflow extension
- 新增 rovodev 支持
- 修复私有仓库 preset 和 workflow 下载的 GitHub release asset API URL
- 多个依赖更新

**v0.9.4 (6/4/2026)**
- Workflow run 新增 JSON 输出
- Cursor agent CLI dispatch 端到端支持
- Extension add 新增 `--force` 标志支持覆盖重装
- 允许在无项目情况下执行 YAML workflow 文件

**v0.9.3 (6/3/2026)**
- 新增 `specify self upgrade` CLI 命令
- Workflow resume 支持接受更新的 workflow 输入
- Windows UTF-8 输出修复
- "superpowers-bridge" 重命名为 "superspec"

**v0.9.2 (6/2/2026)**
- Workflow step 新增 `continue_on_error` 字段
- Product Forge extension 更新至 v1.6.0
- 多个 bugfix

**v0.9.1 (6/2/2026)**
- 新增 native Cline integration
- Hermes Agent integration 文档
- 多个兼容性和 bugfix

**v0.9.0 (6/1/2026)**
- Agent context 更新迁移到独立的 agent-context extension（向后兼容）
- May 2026 Newsletter 发布
- 多个 extension 更新

#### 社区活跃度
- 发布节奏极快，从 6/1 到 6/9 发布了 v0.9.0 到 v0.10.1 共 8 个版本
- 持续完善与各类 AI 编码工具的集成

---

## 趋势分析

### 1. OpenCode 持续高频迭代
- 保持每日发布节奏，v1.16.0 带来重大功能更新（workspace 克隆、session 移动、Bedrock 支持）
- Desktop 应用功能快速完善（颜色主题、多服务器支持）
- 社区贡献活跃，多位贡献者参与

### 2. Spec-Kit 快速发展期
- 进入 0.10.x 时代，完成重大架构调整（git extension 可选、legacy AI 标志移除）
- 与各类 AI 工具集成（Hermes、Cline、rovodev）持续扩展
- 发布频率显著加快

### 3. OpenSpec 保持稳定
- v1.4.x 周期以 bugfix 和兼容性为主
- 持续扩展支持的 AI 工具范围（Kimi CLI、Mistral Vibe）

### 4. Open-Agents 专注基础设施
- 无正式 release，以 commit 形式持续改进
- 重点在 sandbox 安全性和工作流稳定性
- PNPM 迁移表明在优化开发体验

### 5. Superpowers 保持稳定
- 暂无新版本发布，保持 v5.1.0

---

## 下次检查建议

- 关注 OpenCode v1.17.x 发布
- 关注 Spec-Kit v0.11.0 开发进展
- 关注 Superpowers v5.2.0 动向
