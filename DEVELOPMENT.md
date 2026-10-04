# Prism v0.2 开发协作文档 (MASTER)

> **最后更新**: 2026-06-03  
> **当前阶段**: Phase 1 - 插件化架构 + 核心功能实现  
> **目标**: 让Prism从"无法使用"变为"可演示的MVP"

---

## 一、项目现状速览

### 已完成 ✅
- [x] 插件化架构基础代码（7个新模块）
  - `plugin-types.ts` - 类型定义
  - `ide-health-check.ts` - IDE检测服务
  - `PluginManager.ts` - 延迟加载管理器
  - `PluginRegistry.ts` - 插件注册表
  - `user-error-handler.ts` - 友好错误处理
  - `plugin-system.ts` - Electron集成层
  - `plugin-system.spec.ts` - 集成测试
- [x] 架构设计和竞品分析报告
- [x] 技术路线图规划

### 待完成 🚧
- [ ] 将新插件化架构集成到 main.ts
- [ ] 实现Skill自动触发系统（WorkflowEngine）
- [ ] 实现首次运行IDE向导
- [ ] 实现权限控制系统（原型）

### 关键文件路径
```
d:\Cloud\Projects\01-Prism\Code\Prism\
├── electron/
│   ├── main.ts                    # ⭐ 主进程入口（需修改）
│   ├── adapters/
│   │   ├── AdapterManager.ts      # 旧管理器（将被替换/兼容）
│   │   ├── PluginManager.ts       # 新插件管理器（已写好）
│   │   ├── PluginRegistry.ts      # 插件注册表（已写好）
│   │   ├── plugin-system.ts       # 集成层（已写好）
│   │   ├── plugin-types.ts        # 类型定义（已写好）
│   │   ├── ide-health-check.ts    # IDE检测（已写好）
│   │   └── user-error-handler.ts  # 错误处理（已写好）
│   └── helm/
│       ├── template-engine.ts     # ⭐ 需改造为WorkflowEngine
│       └── (新建) skills/          # Skill文件目录（待创建）
├── src/
│   └── components/
│       └── (新建) modals/          # UI组件（待创建）
└── tests/
    └── integration/
        └── plugin-system.spec.ts  # 测试套件（已写好）
```

---

## 二、技术约束与规范

### 必须遵守的规则 🔴

1. **不破坏现有功能**
   - 所有改动必须向后兼容
   - 保持 AdapterManager 接口可用（作为fallback）
   - 不删除现有适配器代码

2. **TypeScript严格模式**
   - 启用 strict: true
   - 所有新代码必须有类型注解
   - 禁止 any（除非明确标注 @ts-ignore + 原因）

3. **错误处理规范**
   - 使用 user-error-handler.ts 的 classifyError()
   - 所有用户可见的错误必须是 UserFacingError 格式
   - 禁止静默 catch（至少 console.warn）

4. **命名约定**
   - 文件名: kebab-case (e.g., `plugin-manager.ts`)
   - 类名: PascalCase (e.g., `PluginManager`)
   - 接口前缀: I 或不加前缀（本项目风格是不加）
   - 方法名: camelCase (e.g., `getActivePlugin`)
   - 常量: UPPER_SNAKE_CASE (e.g., `DEFAULT_CONFIG`)

5. **导入顺序**
   ```typescript
   // 1. Node内置模块
   import * as fs from 'fs';
   import * as path from 'path';
   
   // 2. 第三方库
   import express from 'express';
   
   // 3. 项目内部模块（相对路径）
   import { PluginManager } from './PluginManager';
   import type { PluginMetadata } from './plugin-types';
   ```

6. **Git提交规范**
   - feat: 新功能
   - fix: 修复bug
   refactor: 重构（不改变行为）
   docs: 文档
   test: 测试
   chore: 构建/工具
   
   示例: `feat(plugin): integrate PluginManager into main.ts`

---

## 三、窗口分工与依赖关系

### 并行策略图

```
时间线 →    Day 1     Day 2     Day 3     Day 4     Day 5
           ├─────────┼─────────┼─────────┼─────────┤
           
Window 1:  [█████████] ████████ 
  基础设施    集成      测试
            
Window 2:            [██████████████████] 
  Skill系统              实现    测试
            
Window 3:            [██████████████████████]
  前端UI                 实现    联调
            
Window 4:                      [████████████████]
  权限系统                          原型
```

**依赖说明**:
- Window 1 必须最先完成（其他窗口依赖其产出）
- Window 2 和 3 可以并行（后端+前端分离）
- Window 4 可以在 Day 3 启动（依赖 Window 1 完成）

---

## 四、共享数据结构

### 4.1 全局状态接口

```typescript
// 所有窗口都必须认知的全局状态类型

interface GlobalPrismState {
  // 插件系统
  pluginSystem: {
    initialized: boolean;
    activePluginId: string | null;
    availablePlugins: string[];
    lastDetectionTime: Date | null;
  };
  
  // 当前项目
  project: {
    root: string | null;
    name: string | null;
    helmDocsScanned: boolean;
  };
  
  // 用户设置
  settings: {
    requireProposal: boolean;      // 是否启用artifact工作流
    defaultPermissionLevel: 'allow' | 'ask' | 'confirm' | 'deny';
    autoDetectIDE: boolean;
    showWelcomeWizard: boolean;
  };
  
  // 当前会话
  session: {
    id: string | null;
    currentPhase: HelmPhase | null;
    activeSkills: string[];         // 当前激活的skills列表
    artifacts: ChangeArtifact[];   // 进行中的artifacts
  };
}

type HelmPhase = 'init' | 'design' | 'develop' | 'extend' | 'fix' | 'optimize';
```

### 4.2 IPC通信协议

```typescript
// 新增的IPC channel定义（所有窗口遵守）

// === Plugin System ===
'get_plugin_summary'           → { success, data: PluginSummary[] }
'run_diagnostics'              → { success, report, userSummary }
'get_installation_guide'      → { success, guide }
'auto_detect_ides'             → { success, activePluginId, availablePlugins, userMessage }

// === Artifact Workflow ===
'create_proposal'              → { success, artifactId, status }
'approve_proposal'             → { success }
'list_artifacts'               → { artifacts[] }
'execute_artifact'             → { success }

// === Permission ===
'update_permission_config'     → { success }
'check_permission'             → { allowed, requiresConfirmation }

// === Events (Main → Renderer) ===
'plugin-activated'             → { pluginId }
'plugin-error'                 → { pluginId, error }
'proposal-created'             → { artifact }
'phase-changed'                → { phase, skills[] }
'permission-prompt'            → { action, details }
```

---

## 五、测试策略

### 5.1 每个窗口必须交付的测试

| 窗口 | 单元测试 | 集成测试 | E2E测试 |
|------|---------|---------|--------|
| W1: 基础设施 | PluginManager.test.ts | plugin-system-integration.spec.ts | 手动验证 |
| W2: Skill系统 | WorkflowEngine.test.ts | skill-triggering.spec.ts | 手动验证 |
| W3: 前端UI | IdeSelectionModal.test.ts | ide-selection-e2e.spec.ts | Playwright |
| W4: 权限系统 | PermissionMiddleware.test.ts | permission-flow.spec.ts | 手动验证 |

### 5.2 测试命令

```bash
# 运行所有测试
npm test

# 运行特定窗口的测试
npm test -- tests/integration/plugin-system.spec.ts
npm test -- src/components/modals/IdeSelectionModal.test.tsx

# E2E测试
npm run test:e2e
```

---

## 六、完成标准 (Definition of Done)

每个窗口完成任务时，必须满足：

### 代码质量 ✅
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint warning
- [ ] 所有新增函数有 JSDoc 注释
- [ ] 测试覆盖率 > 80%（核心逻辑100%）

### 功能完整性 ✅
- [ ] 主流程可跑通（手动测试通过）
- [ ] 边界情况有处理（空值、超时、权限不足）
- [ ] 错误信息友好（使用 UserFacingError）

### 文档交付 ✅
- [ ] 更新本 MASTER DOCUMENT（在"进度追踪"部分标记完成）
- [ ] 在"已知问题"部分记录任何临时解决方案
- [ ] 如果引入新的依赖，更新 package.json 说明

---

## 七、进度追踪

### Window 1: 基础设施集成
- [x] 状态: **已完成** ✅
- [ ] 负责人: AI Programmer #1
- [ ] 开始时间: 2026-06-03
- [ ] 完成时间: 2026-06-03
- [ ] PR链接: ___
- [x] 备注: 成功将7个新插件模块集成到 main.ts，包括：
  - ✅ 替换 AdapterManager 导入为 plugin-system.ts 函数
  - ✅ 在 app.whenReady() 中初始化插件系统并自动检测IDE
  - ✅ 重构 set_active_ide handler 使用新的安全激活方法
  - ✅ 重构 dispatch_intent handler 加入 fallback 逻辑
  - ✅ 添加4个新的诊断 IPC handlers (get_plugin_summary, run_diagnostics, get_installation_guide, auto_detect_ides)
  - ✅ 更新清理逻辑使用 cleanupPluginSystem()
  - ✅ 保持向后兼容，AdapterManager 作为 fallback 可用
  - ⚠️ 预存在编译错误: UserErrorModal.tsx 中 lucide-react 的 Github 导出问题（与本次修改无关）

### Window 2: Skill自动触发系统
- [ ] 状态: **待开始** (依赖W1)
- [ ] 负责人: AI Programmer #2
- [ ] 开始时间: ___
- [ ] 完成时间: ___
- [ ] PR链接: ___
- [ ] 备注: ___

### Window 3: 前端UI组件
- [ ] 状态: **待开始** (依赖W1)
- [ ] 负责人: AI Programmer #3
- [ ] 开始时间: ___
- [ ] 完成时间: ___
- [ ] PR链接: ___
- [ ] 备注: ___

### Window 4: 权限系统原型
- [ ] 状态: **待开始** (依赖W1)
- [ ] 负责人: AI Programmer #4
- [ ] 开始时间: ___
- [ ] 完成时间: ___
- [ ] PR链接: ___
- [ ] 备注: ___

---

## 八、已知问题与临时方案

<!-- 各窗口遇到的问题记录在这里 -->

### 问题模板
```
#### [日期] 问题标题
- **发现者**: Window X
- **影响**: 高/中/低
- **描述**: 具体问题描述
- **临时方案**: 绕过方法
- **最终方案**: (待定/已解决于PR #xxx)
```

---

## 九、决策日志

<!-- 重要架构决策记录 -->

### 决策模板
```
#### [日期] 决策: XXX
- **背景**: 为什么需要做这个决定
- **选项**: A vs B vs C
- **选择**: 最终选了什么
- **理由**: 为什么选这个
- **影响**: 影响哪些窗口/文件
```

---

## 十、联系与协调

### 协作规范
1. **修改共享文件前必须先读最新的 MASTER DOCUMENT**
2. **如果发现其他窗口的代码有问题，在本窗口的"备注"中记录，不要直接修改别人的代码**
3. **IPC channel 名称冲突**: 所有新增channel先在这里注册，避免重复
4. **合并冲突**: 优先 rebase 而不是 merge，保持历史清晰

### 紧急情况
- 如果发现架构性问题可能影响多个窗口，立即在此文档顶部添加 ⚠️ WARNING
- 其他窗口看到WARNING后暂停工作，等待协调

---

**文档维护者**: AI Architect (本窗口)  
**最后审阅**: ___  
**版本**: v0.2-alpha
