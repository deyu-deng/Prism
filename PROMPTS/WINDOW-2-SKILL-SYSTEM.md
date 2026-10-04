# AI Programmer #2 提示词：Skill自动触发系统

## 你的角色
你是 Prism 项目的 **工作流引擎工程师**，负责实现从竞品 superpowers 借鉴的 Skill 自动触发机制，让 AI 的行为可以根据当前开发阶段动态调整。

## 核心任务
**创建 WorkflowEngine + 6个核心 Skills，替代现有的静态模板注入系统。**

## 必读文档（先读完再动手）
1. **`DEVELOPMENT.md`** - 项目协作文档（MASTER DOCUMENT）
2. **`electron/helm/template-engine.ts`** - 现有的静态模板系统（你将改造它）
3. **`electron/helm/phase-parser.ts`** - 阶段解析器（你需要理解它的输出格式）
4. **Window 1 的产出** - 如果 Window 1 已完成，新的 main.ts 和 PluginManager

## 背景知识：为什么需要这个？

### 现状问题
```typescript
// 当前的 template-engine.ts 是这样的：
export async function renderSystemPrompt(phase: string, options: any) {
  return `# Phase: ${phase}\nTask: ${options.taskSummary}`;
}
// 问题：无论什么阶段，AI拿到的指令都差不多！
```

### 目标状态
```typescript
// 新的 WorkflowEngine 会这样做：
DESIGN阶段 → 注入 brainstorming + writing-plans skills
DEVELOP阶段 → 注入 tdd-enforcer + executing-plans skills  
FIX阶段 → 注入 debugging + root-cause-analysis skills
每个阶段的AI行为完全不同且经过优化！
```

## 具体工作清单

### Step 1: 创建 Skill 文件目录和基础结构 (30分钟)

**位置**: `electron/helm/skills/`

创建目录：
```
electron/helm/skills/
├── base-rules.md              # 所有阶段共享的基础规则
├── brainstorming.skill.md     # DESIGN阶段用
├── writing-plans.skill.md     # DESIGN→DEVELOP过渡用
├── tdd-enforcer.skill.md      # DEVELOP阶段用
├── code-reviewer.skill.md     # EXTEND阶段用
├── debugging.skill.md         # FIX阶段用
└── documentation.skill.md     # 所有阶段通用
```

### Step 2: 编写 base-rules.md (45分钟)

这是所有阶段都会注入的基础行为规则：

```markdown
---
name: prism-base-rules
phase: all  # 所有阶段都加载
priority: 1000  # 最高优先级
---

# Prism Agent Core Behavior Rules

## 🎯 身份定义
You are an AI coding assistant powered by Prism's structured workflow engine.
Your role is to help developers build high-quality software through disciplined processes.

## ⚠️ 强制规则（违反会导致任务失败）

1. **NEVER ask questions in text**
   - When you need user input, ALWAYS call the `prism_ask_user` MCP tool
   - This ensures the user sees a proper UI for responding
   
2. **ALWAYS update TASK.md after completing work**
   - Mark tasks as completed/in-progress/blocked
   - Add notes about decisions made or issues found
   
3. **NEVER execute destructive operations without confirmation**
   - File deletion, database migrations, etc. must be confirmed first
   - Use `prism_ask_user` with type="confirm" for these cases
   
4. **ALWAYS document architectural decisions**
   - Use `prism_write_decision` tool for any non-trivial technical choice
   - Include context, alternatives considered, and consequences

5. **RESPECT the current phase constraints**
   - Each phase has specific goals and boundaries
   - Do not jump ahead to later phases without explicit user request

## 🔧 工具使用指南

| 场景 | 使用工具 | 说明 |
|------|---------|------|
| 需要用户决策 | `prism_ask_user` | 提供选择/确认/输入 |
| 记录架构决策 | `prism_write_decision` | 写入 ADR 文件 |
| 更新任务状态 | `prism_update_task` | 更新 TASK.md |
| 读取项目上下文 | `prism_read_context` | 获取 Helm 文档摘要 |

## 📋 输出质量标准

- Code should be production-ready, not prototype-quality
- Comments should explain "why", not "what"
- Follow existing project conventions (check existing code first)
- Error handling should be explicit, not silent

## 🚫 禁止行为

- ❌ Copy-pasting code without understanding it
- ❌ Making assumptions about requirements (ask instead)
- ❌ Ignoring test failures or warnings
- ❌ Refactoring without running tests after each change
- ❌ Adding dependencies without justification
```

### Step 3: 编写6个核心 Skills (每个30-45分钟)

#### Skill 1: brainstorming.skill.md

```markdown
---
name: brainstorming
phase: design
triggers:
  - intent_type: "feature"
  - intent_type: "refactor"
  - phase_entered: "design"
when: Before creating any design document or implementation plan
---

# 🧠 Brainstorming Mode Activated

## WHAT
Generate multiple solution approaches before committing to one.

## HOW
For the given task, produce **3 different approaches**:

### Approach A: The Obvious Solution
- Most straightforward implementation
- Pros: Fast to implement, easy to understand
- Cons: May not scale, might have technical debt

### Approach B: The Robust Solution  
- Focus on reliability and maintainability
- Pros: Clean architecture, well-tested
- Cons: Takes longer, may be over-engineered for simple needs

### Approach C: The Innovative Solution
- Leverage modern patterns or unconventional approaches
- Pros: Potential competitive advantage, learning opportunity
- Cons: Higher risk, may be unfamiliar to team

## For each approach, provide:
1. **Architecture**: High-level structure (2-3 sentences)
2. **Key Components**: Main modules/classes needed
3. **Trade-offs**: What you gain vs what you lose
4. **Effort estimate**: T-shirt size (S/M/L/XL)
5. **Risks**: What could go wrong

## OUTPUT FORMAT
```markdown
## Brainstorming Results for: [TASK]

### Option A: [Name]
[Description]

### Option B: [Name]  
[Description]

### Option C: [Name]
[Description]

## Recommendation
Based on the context, I recommend **Option X** because...
```

## PRISM INTEGRATION
After generating options:
- Call `prism_ask_user` with questionType="choice"
  title: "Select implementation approach"
  options: [Option A, Option B, Option C]
- Wait for user selection before proceeding to next skill
```

#### Skill 2: writing-plans.skill.md

```markdown
---
name: writing-plans
phase: design  
triggers:
  - after: brainstorming
  - intent_type: "feature" with complexity > simple
when: After approach is selected, before writing code
---

# 📝 Plan Writing Mode Activated

## WHAT
Create a detailed, actionable implementation plan that breaks down work into verifiable steps.

## HOW

### Step 1: Define Success Criteria
What does "done" look like? List specific, measurable outcomes:
- ✅ Feature X works with input Y
- ✅ Test coverage > 80%
- ✅ Response time < 200ms
- ✅ No regression in existing features

### Step 2: Identify Tasks (Vertical Slicing)
Break into independent, deliverable slices:

```markdown
## Implementation Plan: [FEATURE NAME]

### Slice 1: Foundation [Priority: P0]
**Goal**: [What this slice achieves]
**Tasks**:
- [ ] Task 1.1: [Specific action item]
- [ ] Task 1.2: [Specific action item]
**Deliverable**: [Concrete output]
**Dependencies**: None
**Estimated**: [Time]

### Slice 2: Core Logic [Priority: P0]
**Goal**: [What this slice achieves]
**Tasks**:
- [ ] Task 2.1: ...
**Deliverable**: [Concrete output]  
**Dependencies**: Slice 1
**Estimated**: [Time]

### Slice 3: Polish [Priority: P1]
...
```

### Step 3: Identify Risks
For each task, note:
- ⚠️ Technical risks (uncertain APIs, performance concerns)
- ⚠️ Dependency risks (waiting on other teams, external services)  
- ⚠️ Scope risks (requirements might change)

### Step 4: Define Checkpoints
Where will we verify progress?
- After Slice 1: [Verification method]
- After Slice 2: [Verification method]
- Final: [Full acceptance criteria]

## QUALITY CHECKLIST
Your plan must pass these checks:
- [ ] Each task is small enough to complete in < 2 hours
- [ ] Dependencies are clearly marked
- [ ] No task depends on a parallel task's internal details
- [ ] Edge cases are called out explicitly
- [ ] Rollback strategy exists for risky changes

## PRISM INTEGRATION
After writing plan:
- Update TASK.md with the plan content
- Call `prism_update_task` to create task entries
- Ask user: "Does this plan look right? Any adjustments?"
```

#### Skill 3: tdd-enforcer.skill.md

```markdown
---
name: tdd-enforcer
phase: develop
triggers:
  - phase_entered: "develop"
  - about_to: write_implementation_code
when: During implementation, BEFORE writing any production code
---

# 🔄 TDD Enforcement Mode Activated

## WHAT
Strictly follow Test-Driven Development cycle: RED → GREEN → REFACTOR.

## THE CYCLE (Repeat for each logical unit of work)

### 🔴 RED PHASE: Write a Failing Test
1. **Understand the requirement** - What should the code do?
2. **Write the test FIRST** - Describe expected behavior
3. **Run the test** - Confirm it FAILS (if it passes, why?)
4. **If test passes unexpectedly**:
   - Either requirement already met (skip to next unit)
   - Or test is flawed (fix the test)

Test naming convention:
```
describe('[Feature]', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act  
    // Assert
  });
});
```

### 🟢 GREEN PHASE: Minimal Implementation
1. **Write JUST ENOUGH code** to make the test pass
2. **NO refactoring yet** - Keep it ugly if needed
3. **Run ALL tests** - Ensure no regressions
4. **If other tests fail**:
   - Fix them (they revealed real issues)
   - Or determine if they're false positives

Rules for GREEN phase:
- ✅ DRY principle OK here (Don't Repeat Yourself in tests)
- ❌ NO optimization premature
- ❌ NO error handling beyond what test requires
- ❌ NO extra features ("while I'm here...")

### 🔵 REFACTOR PHASE: Improve Quality
1. **With green tests as safety net**, improve the code:
   - Extract methods for clarity
   - Rename variables for readability
   - Reduce duplication
   - Improve error messages
2. **Run tests after EACH refactoring step**
3. **If tests fail**: Undo, try different approach

Refactoring checklist:
- [ ] Method length < 20 lines
- [ ] Nesting depth < 4 levels
- [ ] No magic numbers/strings
- [ ] Clear variable names
- [ ] Single responsibility per function

## ANTI-PATTERNS (FORBIDDEN 🚫)
❌ Writing implementation before tests
❌ Skipping tests because "it's obvious"  
❌ Writing multiple failing tests at once
❌ Refactoring during GREEN phase
❌ Committing untested code
❌ Tests that depend on implementation details
❌ Mocking everything (test real behavior when possible)

## TEST CATEGORIES TO COVER

### Happy Path ✅
- Normal inputs with expected outputs
- Typical user workflows

### Sad Path 😢
- Invalid inputs
- Missing/optional parameters
- Empty states, null values

### Edge Cases ⚡
- Boundary conditions (empty array, single item, max items)
- Concurrent access (if applicable)
- Performance limits (large inputs)

## PRISM INTEGRATION
During TDD cycle:
- After RED: Call `prism_update_task` with status="testing"
- After GREEN: Call with status="implementing" 
- After REFACTOR: Call with status="reviewing"
- If stuck > 30min: Call `prism_ask_user` for help
```

#### Skill 4: code-reviewer.skill.md

```markdown
---
name: code-reviewer
phase: extend
triggers:
  - phase_entered: "extend"
  - task_completed: true
  - before: commit/push
when: After implementation, before considering work done
---

# 🔍 Code Review Mode Activated

## WHAT
Perform systematic self-review of implemented code using multiple lenses.

## REVIEW LENSES (Apply in order)

### Lens 1: Correctness (5 min)
- [ ] Does the code do what it's supposed to?
- [ ] Are edge cases handled?
- [ ] Error paths tested?
- [ ] Any off-by-one errors possible?

Check with:
```bash
# Run the test suite
npm test -- --grep "[feature_name]"

# Check for TypeScript errors
npx tsc --noEmit
```

### Lens 2: Security (3 min)
- [ ] Input validation present?
- [ ] SQL/Command injection possible?
- [ ] Authentication/Authorization correct?
- [ ] Sensitive data logged or exposed?

Security checklist:
- User inputs sanitized?
- File paths validated?
- Environment variables not hardcoded?
- No eval() or dangerous dynamic code?

### Lens 3: Performance (3 min)
- [ ] Any O(n²) or worse algorithms?
- [ ] Unnecessary loops or allocations?
- [ ] Database queries optimized (N+1 problems)?
- [ ] Large files loaded fully when streaming possible?

Quick wins:
- Add `.filter(Boolean)` before maps
- Use Set for lookups instead of Array.includes
- Lazy load heavy dependencies

### Lens 4: Maintainability (5 min)
- [ ] Code readable by someone else in 6 months?
- [ ] Function names describe behavior accurately?
- [ ] Complex logic explained with comments?
- [ ] Magic numbers extracted to named constants?

Naming audit:
```
Bad: handleData(x, y, z)
Good: processUserRegistration(email, password, profile)
```

### Lens 5: Testing (3 min)
- [ ] Tests cover critical paths?
- [ ] Test assertions meaningful (not just .toBeTruthy())?
- [ ] Edge cases covered?
- [ ] Tests independent (no shared mutable state)?

### Lens 6: Documentation (2 min)
- [ ] Public APIs documented?
- [ ] Complex algorithms explained?
- [ ] README updated if user-facing?
- [ ] ADR written for significant decisions?

## OUTPUT FORMAT

After review, generate summary:

```markdown
## Code Review Summary: [Feature/File]

✅ **Passed**: [List what looks good]
⚠️ **Warnings**: [Non-blocking issues to track]
🐛 **Issues Found**: [Must-fix problems]

### Issues (Priority Ordered)
1. **[P0-Critical]**: [Description]  
   Location: [file:line]
   Fix: [Suggestion]

2. **[P1-Should]**: [Description]
   Location: [file:line]
   Fix: [Suggestion]

### Metrics
- Files changed: N
- Lines added: N
- Lines removed: N  
- Test coverage: N%
- Complexity score: N/10

### Recommendation
- [ ] **APPROVED**: Ready to merge/deploy
- [ ] **CONDITIONAL**: Fix P0 issues first
- [ ] **NEEDS WORK**: Major revision required
```

## PRISM INTEGRATION
After review:
- If APPROVED: Call `prism_write_decision` documenting review results
- If ISSUES FOUND: Create tasks for fixes, don't auto-commit
- Always call `prism_ask_user` with review summary for human sign-off
```

#### Skill 5 & 6: debugging.skill.md 和 documentation.skill.md

(类似结构，略简以节省篇幅。包含root cause分析方法、文档自动生成规则等)

### Step 4: 创建 WorkflowEngine 类 (2小时)

**文件**: `electron/helm/workflow-engine.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * WorkflowEngine - 动态工作流引擎
 * 
 * 根据当前开发阶段自动选择并注入对应的 Skill 指令，
 * 替代原有的静态模板注入方式。
 */
export class WorkflowEngine {
  private skillsDir: string;
  private baseRulesPath: string;
  private cache = new Map<string, string>(); // 缓存已加载的skill内容
  
  constructor(projectRoot?: string) {
    // skills目录相对于本文件位置
    this.skillsDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'skills');
    this.baseRulesPath = path.join(this.skillsDir, 'base-rules.md');
  }

  /**
   * 渲染指定阶段的完整系统prompt
   * 包含：base rules + 阶段特定skills + 项目上下文
   */
  async renderPhasePrompt(
    phase: string,
    context: {
      projectRoot?: string;
      taskSummary?: string;
      taskType?: string;
      contextSummary?: string;
      [key: string]: any;
    }
  ): Promise<string> {
    const sections: string[] = [];

    // 1. 加载基础规则（始终包含）
    const baseRules = await this.loadBaseRules();
    if (baseRules) {
      sections.push(baseRules);
    }

    // 2. 加载当前阶段激活的skills
    const activeSkills = await this.getActiveSkills(phase);
    
    // 按优先级排序
    activeSkills.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const skill of activeSkills) {
      sections.push(`\n<!-- SKILL: ${skill.name} -->\n`);
      sections.push(skill.content);
    }

    // 3. 添加上下文信息
    if (Object.keys(context).length > 0) {
      sections.push('\n## Current Context\n');
      sections.push(`**Phase**: ${phase.toUpperCase()}\n`);
      
      if (context.taskSummary) {
        sections.push(`**Task**: ${context.taskSummary}\n`);
      }
      if (context.taskType) {
        sections.push(`**Type**: ${context.taskType}\n`);
      }
      if (context.contextSummary) {
        sections.push(`\n${context.contextSummary}\n`);
      }
    }

    // 4. 组装最终prompt
    return sections.join('\n---\n\n').trim();
  }

  /**
   * 获取指定阶段应该激活的所有skills
   */
  async getActiveSkills(phase: string): Promise<Array<{
    name: string;
    content: string;
    priority?: number;
    phase: string;
  }>> {
    const skills: Array<{
      name: string;
      content: string;
      priority?: number;
      phase: string;
    }> = [];

    try {
      // 读取skills目录中的所有.skill.md文件
      const files = await fs.readdir(this.skillsDir);
      const skillFiles = files.filter(f => f.endsWith('.skill.md'));

      for (const file of skillFiles) {
        const filePath = path.join(this.skillsDir, file);
        const content = await this.loadSkillWithCache(filePath);

        // 解析YAML frontmatter
        const parsed = this.parseSkillFrontmatter(content, file);
        
        // 检查是否应该在当前阶段激活
        if (this.shouldActivateInPhase(parsed, phase)) {
          skills.push({
            name: parsed.name || file.replace('.skill.md', ''),
            content: this.stripFrontmatter(content),
            priority: parsed.priority,
            phase: parsed.phase,
          });
        }
      }
    } catch (error) {
      console.error('[WorkflowEngine] Failed to load skills:', error);
      // 返回空数组而不是抛错，保证降级可用
    }

    return skills;
  }

  /**
   * 判断某个skill是否应该在指定阶段激活
   */
  private shouldActivateInPhase(
    parsed: { phase: string },
    currentPhase: string
  ): boolean {
    const skillPhase = parsed.phase.toLowerCase();
    const targetPhase = currentPhase.toLowerCase();

    // "all" 表示所有阶段都激活
    if (skillPhase === 'all') return true;

    // 精确匹配或逗号分隔的多阶段
    if (skillPhase.includes(targetPhase)) return true;
    if (skillPhase.split(',').map(p => p.trim()).includes(targetPhase)) return true;

    return false;
  }

  /**
   * 解析skill文件的YAML frontmatter
   */
  private parseSkillFrontmatter(content: string, filename: string): {
    name?: string;
    phase: string;
    priority?: number;
    triggers?: string[];
  } {
    const result: any = { phase: 'unknown' };

    // 提取 --- 包围的frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const yamlContent = frontmatterMatch[1];
      
      // 简单解析（不依赖yaml库以减少依赖）
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          const value = valueParts.join(':').trim();
          
          switch (key.trim()) {
            case 'name':
              result.name = value.replace(/['"]/g, '');
              break;
            case 'phase':
              result.phase = value;
              break;
            case 'priority':
              result.priority = parseInt(value, 10) || 0;
              break;
          }
        }
      }
    }

    return result;
  }

  /**
   * 移除frontmatter，只保留内容部分
   */
  private stripFrontmatter(content: string): string {
    return content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
  }

  /**
   * 加载基础规则文件
   */
  private async loadBaseRules(): Promise<string | null> {
    try {
      return await fs.readFile(this.baseRulesPath, 'utf-8');
    } catch {
      console.warn('[WorkflowEngine] base-rules.md not found, skipping');
      return null;
    }
  }

  /**
   * 带缓存的skill文件加载
   */
  private async loadSkillWithCache(filePath: string): Promise<string> {
    const cached = this.cache.get(filePath);
    if (cached) return cached;

    const content = await fs.readFile(filePath, 'utf-8');
    this.cache.set(filePath, content);
    
    // 缓存最多50个文件，防止内存泄漏
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    return content;
  }

  /**
   * 清除缓存（用于测试或热重载）
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取所有可用的阶段列表
   */
  async getAvailablePhases(): Promise<string[]> {
    const phases = new Set<string>();
    
    try {
      const files = await fs.readdir(this.skillsDir);
      const skillFiles = files.filter(f => f.endsWith('.skill.md'));

      for (const file of skillFiles) {
        const filePath = path.join(this.skillsDir, file);
        const content = await this.loadSkillWithCache(filePath);
        const parsed = this.parseSkillFrontmatter(content, file);
        
        if (parsed.phase && parsed.phase !== 'all') {
          parsed.phase.split(',').forEach(p => phases.add(p.trim()));
        }
      }
    } catch (error) {
      console.error('[WorkflowEngine] Failed to get available phases:', error);
    }

    return Array.from(phases);
  }
}

// 导出单例工厂
let _instance: WorkflowEngine | null = null;

export function getWorkflowEngine(projectRoot?: string): WorkflowEngine {
  if (!_instance) {
    _instance = new WorkflowEngine(projectRoot);
  }
  return _instance;
}
```

### Step 5: 改造 template-engine.ts (1小时)

**目标**: 让现有的 `renderSystemPrompt()` 函数委托给 WorkflowEngine

```typescript
// electron/helm/template-engine.ts

// 保留原有的函数签名以确保向后兼容
import { getWorkflowEngine } from './workflow-engine';
import type { HelmPhase, TaskType } from '../../src/types/helm';

/**
 * @deprecated 使用 WorkflowEngine.renderPhasePrompt() 替代
 * 为保持向后兼容而保留的包装函数
 */
export async function renderSystemPrompt(
  phase: HelmPhase,
  options: {
    taskType?: TaskType;
    currentPhase?: HelmPhase;
    contextSummary?: string;
    taskSummary?: string;
    projectRoot?: string;
    [key: string]: any;
  }
): Promise<string> {
  console.log('[template-engine] Delegating to WorkflowEngine...');
  
  try {
    const engine = getWorkflowEngine(options.projectRoot);
    return await engine.renderPhasePrompt(phase, options);
  } catch (error) {
    console.error('[template-engine] WorkflowEngine failed, falling back to legacy:', error);
    
    // 降级到旧的静态模板逻辑
    return renderLegacySystemPrompt(phase, options);
  }
}

/**
 * 旧的静态模板实现（作为fallback保留）
 */
async function renderLegacySystemPrompt(phase: HelmPhase, options: any): Promise<string> {
  // 这里是原有的模板拼接逻辑（从现有代码复制）
  // ... 保持不变作为安全网 ...
  
  return `
# Prism System Prompt - Legacy Mode
## Current Phase: ${phase}
## Task Type: ${options.taskType || 'unknown'}
${options.taskSummary ? `## Task: ${options.taskSummary}` : ''}
${options.contextSummary ? `\n${options.contextSummary}` : ''}
`.trim();
}

// 导出 WorkflowEngine 以便直接使用
export { WorkflowEngine, getWorkflowEngine } from './workflow-engine';
```

### Step 6: 编写单元测试 (1.5小时)

**文件**: `electron/helm/__tests__/workflow-engine.test.ts`

必须覆盖的场景：
1. ✅ 基础功能：renderPhasePrompt 输出包含 base-rules
2. ✅ 阶段过滤：DESIGN阶段包含brainstorming，不包含tdd-enforcer
3. ✅ 多阶段支持：一个skill可以同时属于多个阶段
4. ✅ 缓存机制：重复调用不会重复读取文件
5. ✅ 降级处理：skills目录不存在时返回空（不崩溃）
6. ✅ Frontmatter解析：正确提取name、phase、priority
7. ✅ 性能：100次调用在 < 100ms 内完成

### Step 7: 集成测试与验证 (30分钟)

手动验证步骤：
1. 启动应用
2. 打开 DevTools Console
3. 执行：
```javascript
// 测试WorkflowEngine
const { WorkflowEngine } = await import('/path/to/workflow-engine');
const engine = new WorkflowEngine();

// 测试DESIGN阶段
const designPrompt = await engine.renderPhasePrompt('design', {
  taskSummary: 'Add user authentication',
  taskType: 'feature'
});
console.log('=== DESIGN PROMPT ===');
console.log(designPrompt.substring(0, 500) + '...');
console.log('Contains brainstorming:', designPrompt.includes('Brainstorming'));
console.log('Contains TDD:', designPrompt.includes('TDD')); // 应该为false

// 测试DEVELOP阶段
const developPrompt = await engine.renderPhasePrompt('develop', {
  taskSummary: 'Implement login API',
  taskType: 'feature'
});
console.log('\n=== DEVELOP PROMPT ===');
console.log(developPrompt.substring(0, 500) + '...');
console.log('Contains TDD:', developPrompt.includes('TDD')); // 应该为true
console.log('Contains Brainstorming:', developPrompt.includes('Brainstorming')); // 应该为false
```

## 交付物

### 必须提交
1. **完整的 skills/ 目录** - 6个.skill.md文件 + base-rules.md
2. **workflow-engine.ts** - 完整的WorkflowEngine类
3. **修改后的 template-engine.ts** - 委托给WorkflowEngine
4. **workflow-engine.test.ts** - 单元测试（覆盖率>90%）
5. **测试报告** - 包括手动验证结果
6. **更新 DEVELOPMENT.md**

### 可选但推荐
7. **Skill编写指南** - 方便未来添加新skill
8. **性能基准** - prompt生成耗时对比（旧vs新）

## 完成信号

```
✅ 6个skill文件全部创建并符合格式规范
✅ WorkflowEngine类完整实现并通过单元测试
✅ template-engine成功改造并保持向后兼容
✅ 手动验证：DESIGN阶段包含brainstorming，DEVELOP阶段包含TDD
✅ 无TypeScript编译错误
✅ 所有测试通过
```

**现在开始工作！先创建skills目录和第一个base-rules.md文件。**
