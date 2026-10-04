# AI Programmer #3 提示词：前端UI组件

## 你的角色
你是 Prism 项目的 **前端工程师**，负责创建用户友好的UI组件，让用户能够直观地管理IDE插件、查看执行进度、处理错误提示。

## 核心任务
**创建3个核心UI组件：IDE选择向导、执行进度面板、用户友好的错误弹窗。**

## 必读文档
1. **`DEVELOPMENT.md`** - 项目协作文档（MASTER DOCUMENT）
2. **`src/App.tsx`** - 主应用入口
3. **`src/store/ui.ts`** - UI状态管理
4. **`src/components/modals/`** - 现有的模态框组件（参考风格）
5. **Window 1 的产出** - 新的IPC handlers（get_plugin_summary等）

## 技术栈
- React 19 + TypeScript
- Tailwind CSS 4 (已在项目配置)
- Zustand (状态管理)
- Lucide React (图标库)
- Framer Motion (动画)

## 具体工作清单

### Step 1: 创建 IDE 选择向导组件 (2.5小时)

**文件**: `src/components/plugins/IdeSelectionWizard.tsx`

这是一个首次启动时显示的向导，帮助用户选择和配置IDE。

```tsx
// 完整的组件结构和功能需求：

interface IdeSelectionWizardProps {
  projectRoot: string | null;
  onSelect: (ideId: string) => Promise<{ success: boolean; error?: any }>;
  onSkip?: () => void;
  onDiagnostic?: () => void;
}

interface PluginSummary {
  id: string;
  name: string;
  description: string;
  status: 'registered' | 'loaded' | 'active' | 'error' | 'disabled';
  available: boolean;
  experimental: boolean;
  installationGuide?: {
    title: string;
    steps: Array<{
      title: string;
      description: string;
      command?: string;
    }>;
  };
}
```

**UI设计要求**:

```
┌─────────────────────────────────────────────────┐
│  🎯 Welcome to Prism - IDE Setup Wizard         │
│                                                 │
│  Let's configure your development environment. │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Detected Environment                      │   │
│  ├─────────────────────────────────────────┤   │
│  │ ✅ Node.js v20.x                         │   │
│  │ ✅ TypeScript 5.x                        │   │
│  │ ⚠️ No IDE detected                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Available IDEs:                               │
│  ┌──────────────────┐ ┌──────────────────┐   │
│  │ 🟢 Claude Code   │ │ 🔴 Cursor        │   │
│  │ (Not Installed)  │ │ (Not Installed)  │   │
│  │                  │ │                  │   │
│  │ [Install Guide]  │ │ [Install Guide]  │   │
│  └──────────────────┘ └──────────────────┘   │
│  ┌──────────────────┐ ┌──────────────────┐   │
│  │ 🔴 Windsurf      │ │ 🔴 Antigravity   │   │
│  │ (Not Installed)  │ │ (Experimental)  │   │
│  │ [Install Guide]  │ │ [Learn More]     │   │
│  └──────────────────┘ └──────────────────┘   │
│                                                 │
│  Fallback Option:                              │
│  ☑ Use Generic File Mode (limited features)    │
│                                                 │
│  [Run Diagnostics]  [Skip for Now]              │
└─────────────────────────────────────────────────┘
```

**交互逻辑**:
1. 组件挂载时自动调用 `get_plugin_summary` IPC 获取插件列表
2. 显示每个插件的可用性状态（绿色=可用，红色=未安装）
3. 点击"Install Guide"展开安装步骤
4. 点击已安装的IDE卡片直接选中并调用 `onSelect`
5. "Run Diagnostics" 按钮调用 `run_diagnostics` 并显示结果
6. "Skip for Now" 使用 generic-file adapter

**状态管理**:
```typescript
// 使用Zustand store扩展 ui.ts

interface IdeWizardState {
  isOpen: boolean;
  plugins: PluginSummary[];
  loading: boolean;
  selectedPlugin: string | null;
  expandedGuide: string | null; // 当前展开的安装指南ID
  diagnosticResult: any | null;
  
  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  setPlugins: (plugins: PluginSummary[]) => void;
  selectPlugin: (id: string) => void;
  toggleGuide: (id: string) => void;
  setDiagnosticResult: (result: any) => void;
}
```

### Step 2: 创建执行进度面板 (2小时)

**文件**: `src/components/layout/ExecutionProgress.tsx`

在用户发送意图后，实时显示执行进度和阶段变化。

```tsx
interface ExecutionProgressProps {
  sessionId: string | null;
  currentPhase: HelmPhase | null;
  activeSkills: string[];
  isExecuting: boolean;
  lastUpdate: Date | null;
  
  // 回调
  onViewOutput?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}
```

**UI设计要求**:

```
┌────────────────────────────────────────────┐
│  🚀 Execution Progress                    │
│                                             │
│  Session: sess_1717423456789               │
│  Status: ● Running (2m 34s)                │
│                                             │
│  Phase Progress:                            │
│  INIT ──✅──> DESIGN ──✅──> DEVELOP ─🔄    │
│                     ↑ Current Phase       │
│                                             │
│  Active Skills:                             │
│  ┌────────────────────────────────────┐    │
│  │ 🔄 tdd-enforcer                   │    │
│  │    RED phase: Writing test...      │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │ ⏳ executing-plans (queued)        │    │
│  └────────────────────────────────────┘    │
│                                             │
│  Task Progress:                             │
│  ████████████░░░░░░░░ 65% (13/20 tasks)    │
│  ✅ Task 1: Create Auth model              │
│  ✅ Task 2: Implement login endpoint       │
│  🔄 Task 3: Add middleware (running...)    │
│  ☐ Task 4: Write tests                    │
│  ☐ Task 5: ...                             │
│                                             │
│  [View Live Output] [⏸ Pause] [⏹ Stop]   │
└────────────────────────────────────────────┘
```

**数据来源**:
- 通过 `session-phase-changed` 事件更新当前phase
- 通过 `session-created` 事件获取sessionId
- 任务列表从 `prism_update_task` MCP工具的结果中获取
- Skills列表从 WorkflowEngine 的 `getActiveSkills()` 获取

### Step 3: 创建错误提示弹窗 (1.5小时)

**文件**: `src/components/modals/UserErrorModal.tsx`

将技术性错误转换为用户友好的可视化提示。

```tsx
interface UserErrorModalProps {
  error: {
    title: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestions: Array<{
      text: string;
      action?: {
        type: 'install' | 'configure' | 'retry' | 'open-url' | 'copy-command';
        payload?: string;
        label: string;
      };
    }>;
    technicalDetails?: string;
    documentationUrl?: string;
  };
  onClose: () => void;
}
```

**UI设计要求**:

根据 severity 显示不同的视觉样式：

**Error (严重)**:
```
┌────────────────────────────────────────────┐
│  ❌ IDE Connection Failed                    │
│                                             │
│  The required CLI tool for Claude Code      │
│  is not installed or not in your PATH.       │
│                                             │
│  💡 Suggestions:                             │
│                                             │
│  1️⃣ Install Claude Code CLI                 │
│     Click to view step-by-step guide         │
│     [View Installation Guide →]             │
│                                             │
│  2️⃣ Check if it's already installed          │
│     Run in terminal: claude --version        │
│     [Copy Command 📋]                        │
│                                             │
│  ──────────────────────────────────────      │
│  ▶ Technical Details (click to expand)       │
│  command not found: claude                   │
│  at Object.spawnInternal (child_process.js)  │
│                                             │
│  [Dismiss]  [Report Issue]                   │
└────────────────────────────────────────────┘
```

**Warning (警告)**:
```
┌────────────────────────────────────────────┐
│  ⚠️ File System Monitoring Error            │
│                                             │
│  Prism cannot monitor files for changes.    │
│  This may affect real-time output capture.  │
│                                             │
│  💡 Suggestion:                             │
│  Increase file watcher limits on Linux/Mac  │
│  [Copy Fix Command 📋]                       │
│                                             │
│  [OK, I Understand]                          │
└────────────────────────────────────────────┘
```

**Info (信息)**:
```
┌────────────────────────────────────────────┐
│  ℹ️ No IDE Detected                         │
│                                             │
│  Prism could not detect any supported IDE.   │
│  You can still use Generic File mode with    │
│  limited functionality.                       │
│                                             │
│  [View All IDEs]  [Use Generic Mode]        │
└────────────────────────────────────────────┘
```

**交互特性**:
1. 错误详情默认折叠，点击可展开
2. 建议的操作按钮可直接执行（复制命令、打开URL等）
3. 严重错误提供"报告Issue"链接
4. 支持键盘快捷键：Escape关闭，Enter确认（info类型）

### Step 4: 创建安装指南展示组件 (1小时)

**文件**: `src/components/plugins/InstallationGuide.tsx`

当用户点击"Install Guide"时展示的分步指南。

```tsx
interface InstallationGuideProps {
  guide: {
    title: string;
    steps: Array<{
      title: string;
      description: string;
      command?: string;
      verification?: string;
    }>;
    documentationUrl?: string;
    troubleshooting?: Array<{
      problem: string;
      solution: string;
    }>;
  };
  onClose: () => void;
  onCommandCopied?: (command: string) => void;
}
```

**UI特性**:
- 步骤编号清晰可见
- 命令行代码块带"复制"按钮
- 验证命令可一键运行（如果环境允许）
- 底部显示故障排除FAQ

### Step 5: 集成到主应用 (1小时)

修改 `App.tsx` 或相关布局组件，集成新创建的组件：

**需要添加的全局事件监听**:
```typescript
// 在App组件或顶层layout中

useEffect(() => {
  // 监听插件系统事件
  const handlePluginActivated = (_event: ElectronIpcEvent, data: { pluginId: string }) => {
    console.log('Plugin activated:', data.pluginId);
    // 可以显示toast通知
  };

  const handleIdeSelectionError = (_event: ElectronIpcEvent, error: UserFacingError) {
    // 打开UserErrorModal
    setErrorModal(error);
  };

  const handlePhaseChanged = (_event: ElectronIpcEvent, data: { phase: string }) => {
    // 更新ExecutionProgress
    setCurrentPhase(data.phase);
  };

  window.electron?.ipcRenderer?.on('plugin-activated', handlePluginActivated);
  window.electron?.ipcRenderer?.on('ide-selection-error', handleIdeSelectionError);
  window.electron?.ipcRenderer?.on('session-phase-changed', handlePhaseChanged);

  return () => {
    window.electron?.ipcRenderer?.removeListener('plugin-activated', handlePluginActivated);
    // ... 清理其他监听器
  };
}, []);
```

**条件渲染逻辑**:
```tsx
// 首次启动且没有活跃IDE时显示向导
{!activePlugin && showWelcomeWizard && (
  <IdeSelectionWizard 
    projectRoot={projectRoot}
    onSelect={handleIdeSelect}
  />
)}

// 执行中时显示进度面板
{isExecuting && (
  <ExecutionProgress
    sessionId={currentSession}
    currentPhase={currentPhase}
    activeSkills={activeSkills}
    isExecuting={true}
  />
)}

// 错误时显示弹窗
{error && (
  <UserErrorModal
    error={error}
    onClose={() => setError(null)}
  />
)}
```

## 测试策略

### 单元测试 (使用 Vitest + Testing Library)

每个组件都需要测试：

**IdeSelectionWizard.test.tsx**:
```typescript
describe('IdeSelectionWizard', () => {
  it('should render plugin list on mount', async () => {...});
  it('should show install guide when clicking unavailable plugin', () => {...});
  it('should call onSelect when clicking available plugin', () => {...});
  it('should handle loading state', () => {...});
  it('should expand/collapse installation guide', () => {...});
  it('should run diagnostics and display results', () => {...});
});
```

**ExecutionProgress.test.tsx**:
```typescript
describe('ExecutionProgress', () => {
  it('should display current phase prominently', () => {...});
  it('should list active skills', () => {...});
  it('should show task progress bar', () => {...});
  it('should call onPause when pause button clicked', () => {...});
  it('should update when receiving phase-changed event', () => {...});
});
```

**UserErrorModal.test.tsx**:
```typescript
describe('UserErrorModal', () => {
  it('should render error title and message', () => {...});
  it('should apply correct styling based on severity', () => {...});
  it('should show suggestions with action buttons', () => {...});
  it('should toggle technical details visibility', () => {...});
  it('should copy command to clipboard when button clicked', () => {...});
  it('should call onClose when dismissed', () => {...});
});
```

### E2E测试 (Playwright)

```typescript
// ide-wizard-e2e.spec.ts
test('complete IDE selection flow', async ({ page }) => {
  // 启动应用
  await page.goto('/');
  
  // 应该显示向导（如果没有活跃IDE）
  await expect(page.getByText('Welcome to Prism')).toBeVisible();
  
  // 点击诊断按钮
  await page.getByRole('button', { name: 'Run Diagnostics' }).click();
  await expect(page.getByText('Detection Results')).toBeVisible({ timeout: 5000 });
  
  // 展开安装指南
  await page.getByText('Install Guide').first().click();
  await expect(page.getByText('Step 1:')).toBeVisible();
});
```

## 样式规范

### Tailwind CSS 类名使用约定

```typescript
// 组件容器
<div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">

// 状态颜色
// 成功/可用: text-green-600 bg-green-50 border-green-200
// 错误/不可用: text-red-600 bg-red-50 border-red-200  
// 警告: text-yellow-600 bg-yellow-50 border-yellow-200
// 信息: text-blue-600 bg-blue-50 border-blue-200
// 中立/加载: text-gray-600 bg-gray-50 border-gray-200

// 按钮变体
// 主要: bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2
// 次要: bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md px-4 py-2
// 危险: bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2
// 幽灵: border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md px-4 py-2

// 动画
// 进入: animate-in fade-in duration-200
// 退出: animate-out fade-out duration-150
// 加载: animate-pulse
```

## 交付物

### 必须提交
1. **IdeSelectionWizard.tsx** + 测试文件
2. **ExecutionProgress.tsx** + 测试文件
3. **UserErrorModal.tsx** + 测试文件
4. **InstallationGuide.tsx** + 测试文件
5. **更新 App.tsx 或布局组件** 以集成新组件
6. **测试报告**

### 可选
7. **组件Storybook** (如果时间充裕)
8. **响应式适配** (移动端布局)

## 完成信号

```
✅ 4个组件全部创建并通过单元测试
✅ 集成到主应用并可正常显示
✅ E2E测试通过基本流程
✅ 无TypeScript编译错误
✅ 无ESLint warning
✅ 样式符合Tailwind规范
✅ 支持键盘导航和无障碍访问
```

**现在开始！建议从UserErrorModal开始，因为它最独立且最容易验证效果。**
