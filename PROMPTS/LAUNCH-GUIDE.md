# 🚀 Prism v0.2 多AI程序员协作启动指南

## 📋 文件清单

已生成的文件结构：

```
d:\Cloud\Projects\01-Prism\
├── DEVELOPMENT.md                    ⭐ MASTER DOCUMENT（所有窗口必读）
└── PROMPTS/
    ├── WINDOW-1-BASE-INTEGRATION.md    # AI程序员 #1 提示词
    ├── WINDOW-2-SKILL-SYSTEM.md       # AI程序员 #2 提示词
    ├── WINDOW-3-FRONTEND-UI.md        # AI程序员 #3 提示词
    └── WINDOW-4-PERMISSION-SYSTEM.md  # AI程序员 #4 提示词
```

---

## 🎯 窗口分配总览

| 窗口 | 角色 | 核心任务 | 依赖 | 预计工时 |
|------|------|---------|------|---------|
| **#1** | 基础设施工程师 | 集成PluginManager到main.ts | 无 | 6-8h |
| **#2** | 工作流引擎师 | 实现Skill自动触发系统 | W1完成后 | 8-10h |
| **#3** | 前端工程师 | 创建IDE向导/进度面板/错误弹窗 | W1完成后 | 7-9h |
| **#4** | 安全工程师 | 实现权限控制系统(原型) | W1完成后 | 6-8h |

---

## ⏰ 时间线与依赖关系

```
Day 1 (今天)
├─ Window 1: 启动 ✅
│  ├─ 阅读 DEVELOPMENT.md
│  ├─ 运行测试确认新代码可用
│  ├─ 修改 main.ts (Step 1-4)
│  └─ 添加诊断 IPC handlers (Step 6)
│
Day 2
├─ Window 1: 完成 🎉
│  ├─ 修改清理逻辑 (Step 7)
│  ├─ 手动验证完整流程
│  └─ 更新 DEVELOPMENT.md 进度
│
├─ Window 2, 3, 4: 启动 ✅ (并行)
│  │
│  ├─ Window 2:
│  │  ├─ 创建 skills/ 目录和 base-rules.md
│  │  ├─ 编写 6 个核心 .skill.md 文件
│  │  └─ 创建 WorkflowEngine 类
│  │
│  ├─ Window 3:
│  │  ├─ 创建 UserErrorModal 组件
│  │  ├─ 创建 IdeSelectionWizard 组件
│  │  └─ 创建 ExecutionProgress 组件
│  │
│  └─ Window 4:
│     ├─ 定义权限类型系统
│     ├─ 实现 PermissionMiddleware 类
│     └─ 创建基础 PermissionPanel UI
│
Day 3-4
├─ Window 2: 完成 WorkflowEngine + 改造 template-engine
├─ Window 3: 完成所有组件 + 集成到 App.tsx
├─ Window 4: 完成中间件 + Adapter集成 (MVP版本)
│
Day 5
├─ 联调测试 (Integration Testing)
├─ 修复跨窗口的接口不匹配问题
└─ 端到端手动验证
```

---

## 📖 每个窗口的工作指令

### 给AI程序员的话术模板

在打开每个新窗口时，发送以下消息：

---

#### 🔴 Window 1 (基础设施)

```
你现在是 Prism 项目的基础设施集成工程师。

请先阅读这个协作文档：
[粘贴 DEVELOPMENT.md 的内容或路径]

然后按照这个提示词执行任务：
[粘贴 WINDOW-1-BASE-INTEGRATION.md 的内容]

重要提醒：
1. 你的改动会影响其他所有窗口，务必保证向后兼容
2. 每完成一个 Step 就更新 DEVELOPMENT.md 的进度追踪部分
3. 如果发现其他窗口需要的接口缺失，在"备注"中记录
4. 完成后提供完整的修改后文件（不是diff）
```

---

#### 🟡 Window 2 (Skill系统)

```
你现在是 Prism 项目的工作流引擎工程师。

请先阅读协作文档：
[粘贴 DEVELOPMENT.md]

注意：你需要等 Window 1 完成后再开始深度集成工作，
但现在可以先做独立的部分（创建skills文件、WorkflowEngine类）。

按照这个提示词执行：
[粘贴 WINDOW-2-SKILL-SYSTEM.md 的内容]

你的产出会被 Window 1 的代码调用，所以请注意：
1. 保持 export 接口稳定
2. 在文件顶部注释清楚依赖关系
3. 提供 fallback 逻辑（如果PluginManager不可用）
```

---

#### 🟢 Window 3 (前端UI)

```
你现在是 Prism 项目的前端工程师。

请先阅读协作文档：
[粘贴 DEVELOPMENT.md]

你可以和 Window 2 并行工作，但需要等 Window 1 提供新的 IPC handlers。

按照这个提示词执行：
[粘贴 WINDOW-3-FRONTEND-UI.md 的内容]

UI设计原则：
1. 使用 Tailwind CSS（项目已配置）
2. 参考 src/components/modals/ 中现有组件的风格
3. 所有用户可见文本必须友好（不要显示技术错误）
4. 支持键盘导航和无障碍访问
5. 移动端响应式（可选）
```

---

#### 🔵 Window 4 (权限系统)

```
你现在是 Prism 项目的安全工程师。

请先阅读协作文档：
[粘贴 DEVELOPMENT.md]

⚠️ 这是一个实验性功能，优先级低于其他窗口。
如果时间不足，只实现 MVP 版本（见提示词末尾的"简化方案"）。

按照这个提示词执行：
[粘贴 WINDOW-4-PERMISSION-SYSTEM.md 的内容]

安全原则：
1. 默认应该是最安全的（ask级别），而不是最方便的（allow）
2. 错误时必须降级为允许，不能阻塞正常工作流
3. 权限检查性能开销要小（< 5ms per check）
```

---

## 🔗 跨窗口协调机制

### 共享文档协议

**DEVELOPMENT.md** 是唯一的真相来源。所有窗口必须：

1. **开始前**: 读最新的 DEVELOPMENT.md
2. **工作中**: 
   - 新增 IPC channel → 注册到 "四、共享数据结构" 部分
   - 发现 bug → 记录到 "十、已知问题" 部分
   - 架构决策 → 记录到 "九、决策日志" 部分
3. **完成后**: 
   - 更新 "七、进度追踪" 对应窗口的状态
   - 在 "备注" 字段写明交付物位置

### 冲突解决规则

| 冲突类型 | 解决方式 |
|----------|---------|
| IPC channel 名称重复 | 后定义的窗口改名，先定义的保留 |
| 类型定义不一致 | 以 Window 1（基础设施）的定义为准 |
| 导入路径错误 | 各窗口自行修复，不改共享模块 |
| 测试失败 | 先检查是否其他窗口的代码变更导致 |

### 每日同步会议 (虚拟)

建议每天进行一次状态同步：

```markdown
## Daily Sync - [日期]

### Window 1 (基础设施)
- 状态: ✅ 完成 / 🔄 进行中 / ❌ 阻塞
- 当前进度: Step X/Y
- 阻塞点: (如果有)
- 需要协调: (如果有)

### Window 2 (Skill系统)
- 状态: ...
...

### 风险项
1. [描述] - 影响: [哪些窗口] - 应对: [计划]
```

---

## ✅ 完成验收标准

当所有窗口都报告完成后，执行以下验收：

### 1. 编译检查
```bash
cd d:\Cloud\Projects\01-Prism\Code\Prism
npx tsc --noEmit
# 预期：0 errors, 0 warnings (允许已有的warning)
```

### 2. 测试套件
```bash
npm test
# 预期：所有测试通过，包括新增的
```

### 3. 应用启动测试
```bash
npm run dev
```
控制台应显示：
```
[Prism] Initializing plugin system...
[Prism] Plugin system initialized successfully
[Prism] Auto-selected IDE: ClaudeCode (or No IDE detected)
[Prism] Ready.
```

### 4. 功能验收清单

- [ ] 应用启动无报错
- [ ] 显示 IDE 选择面板（如果没有检测到IDE）
- [ ] 可以选择 IDE 并成功激活
- [ ] 发送意图后有执行进度反馈
- [ ] 出现错误时显示友好提示（不是崩溃）
- [ ] 运行 `get_plugin_summary` 返回正确的插件列表
- [ ] 运行 `run_diagnostics` 返回完整的诊断报告

### 5. 性能基准
| 指标 | 目标值 |
|------|--------|
| 冷启动时间 | < 2s |
| 内存占用（空闲） | < 100MB |
| IDE检测耗时 | < 500ms |
| Skill prompt生成 | < 50ms |

---

## 🆘 常见问题

### Q1: 如果某个窗口的AI质量不好怎么办？
A: 
1. 先让它完成基础框架（即使不完美）
2. 你作为架构师审查并指出关键问题
3. 开启新窗口专门修复那个窗口的问题
4. 或者你自己接手修复（参考它的产出）

### Q2: 如果Window 1延迟了怎么办？
A: Window 2/3/4 可以先用 mock 数据开发：
```typescript
// 在各自代码中添加临时mock:
const mockPluginManager = {
  getActivePlugin: () => ({ id: 'generic-file', name: 'Generic' }),
  getAllPlugins: () => [],
};
// 等Window 1完成后替换为真实实例
```

### Q3: 如何合并所有窗口的代码？
A: 
1. 每个窗口完成后提交 PR 到各自的分支
2. 你负责 code review 和冲突解决
3. 按顺序合并：W1 → W2&W3&W4（并行）→ 最终集成测试

### Q4: 如果发现架构设计有问题怎么办？
A: 
1. 立即暂停所有窗口
2. 在 DEVELOPMENT.md 顶部添加 ⚠️ WARNING
3. 召开紧急协调会议（或你自己决定调整方案）
4. 更新相关窗口的提示词后恢复工作

---

## 📞 紧急联系

如果遇到无法解决的问题：

1. **查看 DEVELOPMENT.md** 的已知问题和决策日志
2. **检查其他窗口的备注** 是否有相关信息
3. **回滚到最后一个稳定的commit** 重新评估

---

**祝协作顺利！记住：目标是让 Prism 从"无法使用"变为"可演示的MVP"。完美是第二阶段的事。** 🚀
